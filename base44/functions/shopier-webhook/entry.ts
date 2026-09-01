import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logSecurity } from '../../shared/security.ts';

const PLAN_DURATION_DAYS = 30;
const PLAN_NAME = '1 Aylık Abonelik';
const PLAN_PRICE = 50;

async function getConfigs(base44) {
  const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
  const get = (key, fallback = '') => configs.find((c) => c.key === key)?.value ?? fallback;
  return {
    apiKey: get('shopier_api_key'),
    secret: get('shopier_secret'),
    successUrl: get('shopier_success_url', '/odeme/basarili'),
    failUrl: get('shopier_fail_url', '/odeme/basarisiz'),
  };
}

async function verifySignature(secret, params) {
  const data = (params.random_nr || '') + (params.platform_order_id || '') + (params.total_order_value || '') + (params.currency || '0');
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return expected === (params.signature || '');
}

// Hem GET (browser redirect) hem POST (server-to-server) destekler
async function parseParams(req) {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  // Query params (GET redirect)
  url.searchParams.forEach((v, k) => { params[k] = v; });
  if (req.method === 'POST' && Object.keys(params).length === 0) {
    try {
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const body = await req.json();
        Object.assign(params, body || {});
      } else {
        const text = await req.text();
        new URLSearchParams(text).forEach((v, k) => { params[k] = v; });
      }
    } catch { /* ignore */ }
  }
  return params;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const params = await parseParams(req);
    const cfg = await getConfigs(base44);

    if (!cfg.secret) return Response.json({ error: 'Shopier yapılandırılmamış' }, { status: 503 });

    const orderId = params.platform_order_id;
    const status = (params.status || '').toLowerCase();
    const isBrowser = req.method === 'GET';

    // İmza doğrulaması
    const valid = await verifySignature(cfg.secret, params);
    if (!valid) {
      await logSecurity(base44, 'shopier_webhook_invalid_sig', { id: '', email: '' }, orderId || 'unknown', 'warning').catch(() => {});
      if (isBrowser) return Response.redirect(cfg.failUrl + '?reason=invalid_signature', 302);
      return Response.json({ error: 'geçersiz imza' }, { status: 403 });
    }

    // Ödeme kaydını bul
    const payments = await base44.asServiceRole.entities.Payment.filter({ shopier_order_id: orderId }).catch(() => []);
    const payment = payments[0];
    if (!payment) {
      if (isBrowser) return Response.redirect(cfg.failUrl + '?reason=no_payment', 302);
      return Response.json({ error: 'ödeme kaydı bulunamadı' }, { status: 404 });
    }

    // İDEMPOTENCY: zaten işlendi
    if (payment.status === 'completed') {
      if (isBrowser) return Response.redirect(cfg.successUrl + '?order=' + orderId, 302);
      return Response.json({ ok: true, already: true });
    }

    // Başarılı ödeme mi?
    const success = status === 'success' || status === '1' || params.payment_status === 'success' || !status;
    if (!success && status && !['success', '1', ''].includes(status)) {
      await base44.asServiceRole.entities.Payment.update(payment.id, { status: 'failed' }).catch(() => {});
      await logSecurity(base44, 'shopier_payment_failed', { id: payment.user_id, email: '' }, orderId, 'warning').catch(() => {});
      if (isBrowser) return Response.redirect(cfg.failUrl + '?order=' + orderId, 302);
      return Response.json({ ok: false, status: 'failed' });
    }

    // Ödeme başarılı — aboneliği aktif et
    const now = new Date();
    const endDate = new Date(now.getTime() + PLAN_DURATION_DAYS * 86400000);

    await base44.asServiceRole.entities.Payment.update(payment.id, {
      status: 'completed',
      payment_id: params.payment_id || params.transaction_id || '',
    }).catch(() => {});

    await base44.asServiceRole.entities.User.update(payment.user_id, {
      membership_status: 'active',
      membership_start: now.toISOString(),
      membership_end: endDate.toISOString(),
      subscription_status: 'ACTIVE',
      subscription_start_date: now.toISOString(),
      subscription_end_date: endDate.toISOString(),
      subscription_plan: PLAN_NAME,
      subscription_price: PLAN_PRICE,
      payment_provider: 'shopier',
      payment_id: payment.id,
      last_payment_date: now.toISOString(),
    }).catch(() => {});

    await base44.asServiceRole.entities.Notification.create({
      user_id: payment.user_id,
      title: 'Aboneliğiniz Aktif Edildi',
      body: `${PLAN_NAME} — ${PLAN_DURATION_DAYS} gün boyunca aktif.`,
      type: 'payment',
    }).catch(() => {});

    await logSecurity(base44, 'shopier_payment_success', { id: payment.user_id, email: '' }, orderId, 'info').catch(() => {});

    if (isBrowser) return Response.redirect(cfg.successUrl + '?order=' + orderId, 302);
    return Response.json({ ok: true, activated: true });
  } catch (e) {
    const msg = e?.message || 'webhook error';
    return Response.json({ error: msg }, { status: 500 });
  }
}