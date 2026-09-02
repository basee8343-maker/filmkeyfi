import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { logSecurity, safeErrorResponse } from '../../shared/security.ts';

// Shopier OAuth token URL'i (config üzerinden değiştirilebilir)
const DEFAULT_TOKEN_URL = 'https://www.shopier.com/oauth/token';

async function getConfigs(base44) {
  const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
  const get = (key, fallback = '') => configs.find((c) => c.key === key)?.value ?? fallback;
  return {
    tokenUrl: get('shopier_oauth_token_url', DEFAULT_TOKEN_URL),
    redirectUri: get('shopier_oauth_redirect_uri', 'https://flimkeyfii.base44.app/functions/shopier-oauth-callback'),
    storedState: get('shopier_oauth_state', ''),
  };
}

// AppConfig'e key-value yaz
async function setConfig(base44, key, value) {
  const existing = await base44.asServiceRole.entities.AppConfig.filter({ key }).catch(() => []);
  if (existing[0]) {
    await base44.asServiceRole.entities.AppConfig.update(existing[0].id, { value }).catch(() => {});
  } else {
    await base44.asServiceRole.entities.AppConfig.create({ key, value }).catch(() => {});
  }
}

// Basit HTML sonuç sayfası
function htmlPage(title, message, isSuccess) {
  const color = isSuccess ? '#22c55e' : '#ef4444';
  const bg = isSuccess ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
  const icon = isSuccess ? '✓' : '✕';
  return new Response(`<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#fff;padding:1rem}
  .card{max-width:420px;width:100%;background:#141414;border:1px solid #2a2a2a;border-radius:1rem;padding:2.5rem 2rem;text-align:center}
  .icon{width:64px;height:64px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:2rem;color:${color}}
  h1{font-size:1.5rem;font-weight:700;margin-bottom:.5rem}
  p{color:#a0a0a0;font-size:.875rem;line-height:1.5;margin-bottom:1.5rem}
  a{display:inline-block;padding:.75rem 1.5rem;background:#e50914;color:#fff;border-radius:.5rem;text-decoration:none;font-weight:600;font-size:.875rem}
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">Ana Sayfaya Dön</a>
  </div>
</body>
</html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export default async function (req) {
  const log = (step, data) => {
    try { console.log(`[Shopier OAuth Callback] ${step}:`, typeof data === 'string' ? data : JSON.stringify(data)); } catch {}
  };

  try {
    log('received', { method: req.method, url: req.url });

    if (req.method !== 'GET') {
      return Response.json({ error: 'Bu endpoint sadece GET isteklerini kabul eder' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');

    log('params', { has_code: !!code, has_state: !!state, error, error_desc: errorDesc });

    // Shopier'den hata dönmüşse
    if (error) {
      log('oauth_error', { error, errorDesc });
      await logSecurity(base44, 'shopier_oauth_error', { id: '', email: '' }, `${error}: ${errorDesc || ''}`, 'warning').catch(() => {});
      return htmlPage('Bağlantı Başarısız', errorDesc || 'Shopier bağlantısı reddedildi veya bir hata oluştu.', false);
    }

    // code ve state zorunlu
    if (!code || !state) {
      log('missing_params', { has_code: !!code, has_state: !!state });
      await logSecurity(base44, 'shopier_oauth_missing_params', { id: '', email: '' }, 'code or state missing', 'warning').catch(() => {});
      return htmlPage('Bağlantı Başarısız', 'Gerekli OAuth parametreleri eksik. Lütfen tekrar deneyin.', false);
    }

    const clientId = secrets.get('SHOPIER_CLIENT_ID');
    const clientSecret = secrets.get('SHOPIER_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      log('error', 'OAuth client credentials not set');
      await logSecurity(base44, 'shopier_oauth_no_credentials', { id: '', email: '' }, 'Client ID or Secret missing', 'critical').catch(() => {});
      return htmlPage('Yapılandırma Hatası', 'Shopier OAuth bilgileri eksik. Lütfen yöneticinizle iletişime geçin.', false);
    }

    const cfg = await getConfigs(base44);

    // --- STATE DOĞRULAMASI ---
    if (!cfg.storedState) {
      log('state_error', 'No stored state found in AppConfig');
      await logSecurity(base44, 'shopier_oauth_no_stored_state', { id: '', email: '' }, 'No stored state', 'warning').catch(() => {});
      return htmlPage('Bağlantı Başarısız', 'Bağlantı süresi dolmuş. Lütfen tekrar deneyin.', false);
    }

    let storedPayload;
    try {
      storedPayload = JSON.parse(cfg.storedState);
    } catch {
      log('state_error', 'Stored state is not valid JSON');
      return htmlPage('Bağlantı Başarısız', 'Geçersiz oturum. Lütfen tekrar deneyin.', false);
    }

    // State eşleşiyor mu?
    if (storedPayload.state !== state) {
      log('state_mismatch', { stored: storedPayload.state?.slice(0, 8), received: state.slice(0, 8) });
      await logSecurity(base44, 'shopier_oauth_state_mismatch', { id: '', email: '' }, `State mismatch`, 'critical').catch(() => {});
      return htmlPage('Güvenlik Uyarısı', 'Güvenlik doğrulaması başarısız. Bu işlem yetkisiz olabilir.', false);
    }

    // State süresi dolmuş mu? (10 dakika)
    const stateAge = Date.now() - (storedPayload.created_at || 0);
    if (stateAge > 10 * 60 * 1000) {
      log('state_expired', { age_ms: stateAge });
      await logSecurity(base44, 'shopier_oauth_state_expired', { id: '', email: '' }, `State expired after ${stateAge}ms`, 'warning').catch(() => {});
      return htmlPage('Bağlantı Başarısız', 'Bağlantı süresi dolmuş. Lütfen tekrar deneyin.', false);
    }

    log('state_valid', { age_ms: stateAge });

    // --- CODE'I ACCESS TOKEN İLE DEĞİŞ ---
    log('exchanging_code', { token_url: cfg.tokenUrl });

    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: cfg.redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    }).catch((e) => {
      log('token_fetch_error', e?.message || String(e));
      return null;
    });

    if (!tokenRes || !tokenRes.ok) {
      const errText = tokenRes ? await tokenRes.text().catch(() => '') : 'Network error';
      log('token_exchange_failed', { status: tokenRes?.status, err: errText?.slice(0, 200) });
      await logSecurity(base44, 'shopier_oauth_token_failed', { id: '', email: '' }, `Status: ${tokenRes?.status}`, 'critical').catch(() => {});
      return htmlPage('Bağlantı Başarısız', 'Shopier token alınamadı. Lütfen tekrar deneyin.', false);
    }

    const tokenData = await tokenRes.json().catch(() => ({}));
    log('token_received', {
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
    });

    // --- TOKEN'I GÜVENLİ ŞEKİLDE SAKLA (AppConfig, backend-only) ---
    // Access token ve refresh token'ı AppConfig'e yaz — frontend'e ASLA gönderme
    const tokenPayload = JSON.stringify({
      access_token: tokenData.access_token || '',
      refresh_token: tokenData.refresh_token || '',
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || 0,
      obtained_at: Date.now(),
      shopier_id: storedPayload.shopier_id || '',
    });

    await setConfig(base44, 'shopier_oauth_tokens', tokenPayload);
    log('tokens_stored', { in: 'AppConfig' });

    // State'i temizle (tek kullanımlık)
    await setConfig(base44, 'shopier_oauth_state', '');
    log('state_cleared', '');

    // Shopier bağlantı durumunu aktif olarak işaretle
    await setConfig(base44, 'shopier_connected', 'true');
    await setConfig(base44, 'shopier_connected_at', new Date().toISOString());

    await logSecurity(base44, 'shopier_oauth_success', { id: '', email: '' }, 'Shopier account connected via OAuth', 'info').catch(() => {});
    log('completed', 'Shopier OAuth connection successful');

    return htmlPage(
      'Shopier Bağlantısı Başarılı! 🎉',
      'Shopier hesabınız başarıyla bağlandı. Ödeme sistemi artık aktif olarak çalışabilir.',
      true
    );
  } catch (e) {
    console.error('[Shopier OAuth Callback] Error:', e?.message || String(e));
    await logSecurity(base44, 'shopier_oauth_callback_error', { id: '', email: '' }, e?.message || 'error', 'critical').catch(() => {});
    return htmlPage('Beklenmeyen Hata', 'Bir sorun oluştu. Lütfen daha sonra tekrar deneyin veya destek ile iletişime geçin.', false);
  }
}