import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { logSecurity, safeErrorResponse } from '../../shared/security.ts';

// Shopier OAuth yetkilendirme URL'i (config üzerinden değiştirilebilir)
const DEFAULT_AUTH_URL = 'https://www.shopier.com/oauth/authorize';

async function getConfigs(base44) {
  const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
  const get = (key, fallback = '') => configs.find((c) => c.key === key)?.value ?? fallback;
  return {
    authUrl: get('shopier_oauth_auth_url', DEFAULT_AUTH_URL),
    redirectUri: get('shopier_oauth_redirect_uri', 'https://flimkeyfii.base44.app/functions/shopier-oauth-callback'),
  };
}

// AppConfig'e key-value yaz (yoksa oluştur, varsa güncelle)
async function setConfig(base44, key, value) {
  const existing = await base44.asServiceRole.entities.AppConfig.filter({ key }).catch(() => []);
  if (existing[0]) {
    await base44.asServiceRole.entities.AppConfig.update(existing[0].id, { value }).catch(() => {});
  } else {
    await base44.asServiceRole.entities.AppConfig.create({ key, value }).catch(() => {});
  }
}

// Güvenli rastgele state üret
function generateState() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function (req) {
  const log = (step, data) => {
    try { console.log(`[Shopier Onboarding] ${step}:`, typeof data === 'string' ? data : JSON.stringify(data)); } catch {}
  };

  try {
    log('received', { method: req.method, url: req.url });

    if (req.method !== 'GET') {
      return Response.json({ error: 'Bu endpoint sadece GET isteklerini kabul eder' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());

    log('params', {
      shopier_id: params.shopier_id,
      merchant_id: params.merchant_id,
      shop_id: params.shop_id,
      timestamp: params.timestamp,
      has_signature: !!params.signature,
      keys: Object.keys(params),
    });

    const clientId = secrets.get('SHOPIER_CLIENT_ID');
    if (!clientId) {
      log('error', 'SHOPIER_CLIENT_ID secret not set');
      await logSecurity(base44, 'shopier_onboarding_no_client_id', { id: '', email: '' }, 'SHOPIER_CLIENT_ID missing', 'critical').catch(() => {});
      return Response.json({ error: 'Shopier OAuth yapılandırması eksik. Client ID tanımlanmamış.' }, { status: 503 });
    }

    const cfg = await getConfigs(base44);

    // Güvenli state üret ve AppConfig'e kaydet (callback'de doğrulanacak)
    const state = generateState();
    const statePayload = JSON.stringify({
      state,
      created_at: Date.now(),
      shopier_id: params.shopier_id || params.merchant_id || params.shop_id || '',
      timestamp: params.timestamp || '',
    });
    await setConfig(base44, 'shopier_oauth_state', statePayload);
    log('state_stored', { state_prefix: state.slice(0, 8) + '...' });

    // Shopier OAuth yetkilendirme URL'ini oluştur
    const authUrl = new URL(cfg.authUrl);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', cfg.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    // Shopier'den gelen ek parametreleri varsa ilet (örn. shop_id)
    if (params.shopier_id) authUrl.searchParams.set('shopier_id', params.shopier_id);
    if (params.merchant_id) authUrl.searchParams.set('merchant_id', params.merchant_id);

    log('redirecting', { auth_url: authUrl.origin + authUrl.pathname, has_state: true });

    await logSecurity(base44, 'shopier_onboarding_start', { id: '', email: '' }, `State: ${state.slice(0, 8)}...`, 'info').catch(() => {});

    // Shopier yetkilendirme sayfasına yönlendir
    return Response.redirect(authUrl.toString(), 302);
  } catch (e) {
    console.error('[Shopier Onboarding] Error:', e?.message || String(e));
    return safeErrorResponse(e, 'Shopier bağlantısı başlatılamadı. Lütfen tekrar deneyin.');
  }
}