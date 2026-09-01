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
  const params: Record<string, string> = {};
  // POST ise body'den parse et (öncelikli)
  if (req.method === 'POST') {
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
  // URL query params (GET redirect veya POST URL'de query varsa)
  const url = new URL(req.url);
  url.searchParams.forEach((v, k) => { if (params[k] === undefined) params[k] = v; });
  return params;
}

export default async function (req) {
  const log = (step, data) => {
    try { console.log(`[Shopier Webhook] ${step}:`, typeof data === 'string' ? data : JSON.stringify(data)); } catch {}
  };

  try {
    log('received', { method: req.method, url: req.url });

    const base44 = createClientFromRequest(req);
    const params = await parseParams(req);
    const cfg = await getConfigs(base44);

    log('parsed_params', {
      platform_order_id: params.platform_order_id,
      status: params.status,
      buyer_email: params.buyer_email,
      total_order_value: params.total_order_value,
      currency: params.currency,
      has_signature: !!params.signature,
      has_random_nr: !!params.random_nr,
      payment_id: params.payment_id,
      all_keys: Object.keys(params),
    });

    if (!cfg.secret) {
      log('error', 'Shopier secret not configured in AppConfig');
      return Response.json({ error: 'Shopier yapılandırılmamış' }, { status: 503 });
    }

    const status = (params.status || '').toLowerCase();
    const isBrowser = req.method === 'GET';
    const buyerEmail = (params.buyer_email || '').toLowerCase().trim();
    const amount = parseFloat(params.total_order_value || '0');
    const shopierOrderId = params.platform_order_id || params.order_id || '';
    const paymentId = params.payment_id || params.transaction_id || '';

    // --- İMZA DOĞRULAMASI (ZORUNLU) ---
    const valid = await verifySignature(cfg.secret, params);
    log('signature_check', { valid, order_id: shopierOrderId });

    if (!valid) {
      log('rejected', 'Invalid signature — subscription will NOT be activated');
      await logSecurity(base44, 'shopier_webhook_invalid_sig', { id: '', email: buyerEmail }, shopierOrderId || 'unknown', 'warning').catch(() => {});
      if (isBrowser) return Response.redirect(cfg.failUrl + '?reason=invalid_signature', 302);
      return Response.json({ error: 'geçersiz imza' }, { status: 403 });
    }

    log('matching_start', { shopierOrderId, buyerEmail, amount });

    // --- ÖDEME KAYDINI EŞLEŞTİR ---

    // 1) shopier_order_id ile (API form yaklaşımı — bizim oluşturduğumuz sipariş ID)
    let payment = null;
    if (shopierOrderId) {
      const byOrder = await base44.asServiceRole.entities.Payment.filter({ shopier_order_id: shopierOrderId }).catch(() => []);
      payment = byOrder[0];
      log('match_by_order_id', { found: !!payment, payment_id: payment?.id, payment_status: payment?.status });
    }

    // 2) buyer_email + pending ile (ödeme linki yaklaşımı)
    if (!payment && buyerEmail) {
      const pending = await base44.asServiceRole.entities.Payment.filter({ user_email: buyerEmail, status: 'pending' }, '-created_date', 20).catch(() => []);
      log('match_by_email', { pending_count: pending.length, email: buyerEmail });
      if (pending.length > 0) {
        // Miktar eşleşmesi ile en uygun pending ödeme
        payment = pending.find((p) => Math.abs((p.amount || 0) - amount) < 0.01) || pending[0];
        log('matched_payment', { payment_id: payment?.id, amount: payment?.amount, product_id: payment?.product_id });
      }
    }

    // 3) Ödeme kaydı yoksa, kullanıcıyı email ile bul ve yeni kayıt oluştur
    if (!payment && buyerEmail) {
      log('no_pending_payment', 'Trying to find user by email and create payment record');
      const users = await base44.asServiceRole.entities.User.filter({ email: buyerEmail }).catch(() => []);
      const u = users[0];
      log('user_lookup', { found: !!u, user_id: u?.id, username: u?.username });

      if (u) {
        // Miktar ile ürün eşleştir
        const products = await base44.asServiceRole.entities.Package.filter({ active: true }).catch(() => []);
        const product = products.find((p) => Math.abs((p.price || 0) - amount) < 0.01) || null;
        log('product_match_by_amount', { found: !!product, product_id: product?.id, product_name: product?.name });

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
        log('payment_created', { payment_id: payment?.id });
      }
    }

    if (!payment) {
      log('failed', 'No payment record found and no user matched by email — subscription NOT activated');
      await logSecurity(base44, 'shopier_webhook_no_match', { id: '', email: buyerEmail }, shopierOrderId, 'warning').catch(() => {});
      if (isBrowser) return Response.redirect(cfg.failUrl + '?reason=no_payment', 302);
      return Response.json({ error: 'ödeme kaydı bulunamadı' }, { status: 404 });
    }

    // --- İDEMPOTENCY: zaten işlendi ---
    if (payment.status === 'completed') {
      log('idempotent', { payment_id: payment.id, order_id: shopierOrderId, message: 'Payment already completed, skipping — no duplicate subscription' });
      if (isBrowser) return Response.redirect(cfg.successUrl + '?order=' + (shopierOrderId || payment.shopier_order_id), 302);
      return Response.json({ ok: true, already: true });
    }

    // --- BAŞARISIZ / İPTAL DURUMU ---
    if (status && !['success', '1', 'completed', 'paid', ''].includes(status)) {
      const isCancelled = ['cancelled', 'cancel', 'canceled', 'iptal'].includes(status);
      log('payment_failed', { status, isCancelled, payment_id: payment.id });

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
    log('payment_success', { payment_id: payment.id, user_id: payment.user_id, amount: payment.amount });

    // Ürünü bul (süre ve plan adı için)
    let product = null;
    if (payment.product_id) {
      product = await base44.asServiceRole.entities.Package.get(payment.product_id).catch(() => null);
      log('product_lookup', { by: 'product_id', product_id: payment.product_id, found: !!product });
    }
    // Eğer product_id yoksa veya ürün bulunamadıysa, miktar ile eşleştir
    if (!product && amount > 0) {
      const products = await base44.asServiceRole.entities.Package.filter({ active: true }).catch(() => []);
      product = products.find((p) => Math.abs((p.price || 0) - amount) < 0.01) || null;
      log('product_lookup', { by: 'amount', amount, found: !!product, product_name: product?.name });
    }

    const durationDays = product?.duration_days || 30;
    const planName = product?.name || payment.package_name || 'Abonelik';
    log('product_resolved', { product_id: product?.id, product_name: planName, duration_days: durationDays });

    // Kullanıcıyı getir (mevcut abonelik durumunu kontrol etmek için)
    const userRecord = await base44.asServiceRole.entities.User.get(payment.user_id).catch(() => null);
    log('user_record', {
      user_id: payment.user_id,
      found: !!userRecord,
      current_membership_status: userRecord?.membership_status,
      current_membership_end: userRecord?.membership_end,
    });

    // Abonelik başlangıç ve bitiş tarihlerini hesapla
    const now = new Date();
    let startDate = now;
    let endDate = new Date(now.getTime() + durationDays * 86400000);

    // Eğer kullanıcının mevcut aktif aboneliği varsa, yeni süreyi mevcut bitiş tarihinin üzerine ekle
    if (userRecord && userRecord.membership_status === 'active' && userRecord.membership_end) {
      const currentEnd = new Date(userRecord.membership_end);
      if (currentEnd > now) {
        // Mevcut abonelik hala aktif — yeni süreyi mevcut bitiş tarihine ekle
        startDate = currentEnd;
        endDate = new Date(currentEnd.getTime() + durationDays * 86400000);
        log('subscription_extended', {
          current_end: currentEnd.toISOString(),
          new_start: startDate.toISOString(),
          new_end: endDate.toISOString(),
          added_days: durationDays,
        });
      } else {
        log('subscription_expired', { current_end: currentEnd.toISOString(), message: 'Previous subscription expired, starting fresh' });
      }
    } else {
      log('subscription_new', { start: startDate.toISOString(), end: endDate.toISOString() });
    }

    // Ödeme kaydını tamamlandı olarak güncelle
    await base44.asServiceRole.entities.Payment.update(payment.id, {
      status: 'completed',
      payment_id: paymentId,
      shopier_order_id: shopierOrderId || payment.shopier_order_id,
      paid_at: now.toISOString(),
    }).catch(() => {});
    log('payment_updated', { payment_id: payment.id, status: 'completed', paid_at: now.toISOString() });

    // Kullanıcı aboneliğini aktif et
    await base44.asServiceRole.entities.User.update(payment.user_id, {
      membership_status: 'active',
      membership_start: startDate.toISOString(),
      membership_end: endDate.toISOString(),
      subscription_status: 'ACTIVE',
      subscription_start_date: startDate.toISOString(),
      subscription_end_date: endDate.toISOString(),
      subscription_plan: planName,
      subscription_price: payment.amount,
      package_id: payment.product_id || product?.id || '',
      payment_provider: 'shopier',
      payment_id: payment.id,
      last_payment_date: now.toISOString(),
    }).catch(() => {});
    log('user_updated', {
      user_id: payment.user_id,
      membership_status: 'active',
      membership_start: startDate.toISOString(),
      membership_end: endDate.toISOString(),
      subscription_plan: planName,
    });

    // Kullanıcıya bildirim gönder
    await base44.asServiceRole.entities.Notification.create({
      user_id: payment.user_id,
      title: 'Ödeme onaylandı! Aboneliğiniz aktif edildi.',
      body: `${planName} — ${durationDays} gün boyunca aktif. Bitiş: ${endDate.toLocaleDateString('tr-TR')}`,
      type: 'payment',
    }).catch(() => {});
    log('notification_sent', { user_id: payment.user_id, title: 'Ödeme onaylandı! Aboneliğiniz aktif edildi.' });

    await logSecurity(base44, 'shopier_payment_success', { id: payment.user_id, email: buyerEmail }, shopierOrderId, 'info').catch(() => {});
    log('completed', { message: 'Subscription activated successfully', user_id: payment.user_id, end_date: endDate.toISOString() });

    if (isBrowser) return Response.redirect(cfg.successUrl + '?order=' + (shopierOrderId || payment.shopier_order_id), 302);
    return Response.json({ ok: true, activated: true, user_id: payment.user_id, end_date: endDate.toISOString() });
  } catch (e) {
    console.error('[Shopier Webhook] Error:', e?.message || String(e), e?.stack || '');
    await logSecurity(base44, 'shopier_webhook_error', { id: '', email: '' }, e?.message || 'error', 'critical').catch(() => {});
    const msg = e?.message || 'webhook error';
    return Response.json({ error: msg }, { status: 500 });
  }
}