import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logSecurity } from '../../shared/security.ts';

async function getConfigs(base44) {
  const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
  const get = (key, fallback = '') => configs.find((c) => c.key === key)?.value ?? fallback;
  return {
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

    const status = (params.status || '').toLowerCase();
    const isBrowser = req.method === 'GET';
    const buyerEmail = (params.buyer_email || '').toLowerCase().trim();
    const amount = parseFloat(params.total_order_value || '0');
    const shopierOrderId = params.platform_order_id || params.order_id || '';
    const paymentId = params.payment_id || params.transaction_id || '';

    // --- İMZA DOĞRULAMASI (ZORUNLU) ---
    const valid = await verifySignature(cfg.secret, params);
    if (!valid) {
      await logSecurity(base44, 'shopier_webhook_invalid_sig', { id: '', email: buyerEmail }, shopierOrderId || 'unknown', 'warning').catch(() => {});
      if (isBrowser) return Response.redirect(cfg.failUrl + '?reason=invalid_signature', 302);
      return Response.json({ error: 'geçersiz imza' }, { status: 403 });
    }

    // --- ÖDEME KAYDINI EŞLEŞTİR ---

    // 1) shopier_order_id ile (API form yaklaşımı — bizim oluşturduğumuz sipariş ID)
    let payment = null;
    if (shopierOrderId) {
      const byOrder = await base44.asServiceRole.entities.Payment.filter({ shopier_order_id: shopierOrderId }).catch(() => []);
      payment = byOrder[0];
    }

    // 2) buyer_email + pending ile (ödeme linki yaklaşımı)
    if (!payment && buyerEmail) {
      const pending = await base44.asServiceRole.entities.Payment.filter({ user_email: buyerEmail, status: 'pending' }, '-created_date', 20).catch(() => []);
      if (pending.length > 0) {
        // Miktar eşleşmesi ile en uygun pending ödeme
        payment = pending.find((p) => Math.abs((p.amount || 0) - amount) < 0.01) || pending[0];
      }
    }

    // 3) Ödeme kaydı yoksa, kullanıcıyı email ile bul ve yeni kayıt oluştur
    if (!payment && buyerEmail) {
      const users = await base44.asServiceRole.entities.User.filter({ email: buyerEmail }).catch(() => []);
      const u = users[0];
      if (u) {
        // Miktar ile ürün eşleştir
        const products = await base44.asServiceRole.entities.Package.filter({ active: true }).catch(() => []);
        const product = products.find((p) => Math.abs((p.price || 0) - amount) < 0.01) || null;
        payment = await base44.asServiceRole.entities.Payment.create({
          user_id: u.id,
          user_name: u.username || u.full_name || buyerEmail,
          user_email: buyerEmail,
          product_id: product?.id || '',
          package_name: product?.name || '',
          amount: amount,
          status: 'pending',
          provider: 'shopier',
          shopier_order_id: shopierOrderId,
          currency: 'TRY',
        }).catch(() => null);
      }
    }

    if (!payment) {
      if (isBrowser) return Response.redirect(cfg.failUrl + '?reason=no_payment', 302);
      return Response.json({ error: 'ödeme kaydı bulunamadı' }, { status: 404 });
    }

    // --- İDEMPOTENCY: zaten işlendi ---
    if (payment.status === 'completed') {
      if (isBrowser) return Response.redirect(cfg.successUrl + '?order=' + (shopierOrderId || payment.shopier_order_id), 302);
      return Response.json({ ok: true, already: true });
    }

    // --- BAŞARISIZ / İPTAL DURUMU ---
    if (status && !['success', '1', 'completed', 'paid', ''].includes(status)) {
      const isCancelled = ['cancelled', 'cancel', 'canceled', 'iptal'].includes(status);
      await base44.asServiceRole.entities.Payment.update(payment.id, {
        status: isCancelled ? 'cancelled' : 'failed',
        payment_id: paymentId,
        shopier_order_id: shopierOrderId || payment.shopier_order_id,
        paid_at: new Date().toISOString(),
      }).catch(() => {});
      await logSecurity(base44, 'shopier_payment_failed', { id: payment.user_id, email: buyerEmail }, shopierOrderId, 'warning').catch(() => {});
      if (isBrowser) return Response.redirect(cfg.failUrl + '?order=' + shopierOrderId, 302);
      return Response.json({ ok: false, status: 'failed' });
    }

    // --- BAŞARILI ÖDEME — ABONELİĞİ AKTİF ET ---

    // Ürünü bul (süre ve plan adı için)
    let product = null;
    if (payment.product_id) {
      product = await base44.asServiceRole.entities.Package.get(payment.product_id).catch(() => null);
    }
    const durationDays = product?.duration_days || 30;
    const planName = product?.name || payment.package_name || 'Abonelik';

    const now = new Date();
    const endDate = new Date(now.getTime() + durationDays * 86400000);

    // Ödeme kaydını tamamlandı olarak güncelle
    await base44.asServiceRole.entities.Payment.update(payment.id, {
      status: 'completed',
      payment_id: paymentId,
      shopier_order_id: shopierOrderId || payment.shopier_order_id,
      paid_at: now.toISOString(),
    }).catch(() => {});

    // Kullanıcı aboneliğini aktif et
    await base44.asServiceRole.entities.User.update(payment.user_id, {
      membership_status: 'active',
      membership_start: now.toISOString(),
      membership_end: endDate.toISOString(),
      subscription_status: 'ACTIVE',
      subscription_start_date: now.toISOString(),
      subscription_end_date: endDate.toISOString(),
      subscription_plan: planName,
      subscription_price: payment.amount,
      package_id: payment.product_id || '',
      payment_provider: 'shopier',
      payment_id: payment.id,
      last_payment_date: now.toISOString(),
    }).catch(() => {});

    // Kullanıcıya bildirim gönder
    await base44.asServiceRole.entities.Notification.create({
      user_id: payment.user_id,
      title: 'Ödeme onaylandı! Aboneliğiniz aktif edildi.',
      body: `${planName} — ${durationDays} gün boyunca aktif. Bitiş: ${endDate.toLocaleDateString('tr-TR')}`,
      type: 'payment',
    }).catch(() => {});

    await logSecurity(base44, 'shopier_payment_success', { id: payment.user_id, email: buyerEmail }, shopierOrderId, 'info').catch(() => {});

    if (isBrowser) return Response.redirect(cfg.successUrl + '?order=' + (shopierOrderId || payment.shopier_order_id), 302);
    return Response.json({ ok: true, activated: true });
  } catch (e) {
    const msg = e?.message || 'webhook error';
    return Response.json({ error: msg }, { status: 500 });
  }
}