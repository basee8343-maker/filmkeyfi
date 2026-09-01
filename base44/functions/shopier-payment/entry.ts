import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { rateLimit, safeErrorResponse, logSecurity } from '../../shared/security.ts';

const SHOPIER_ENDPOINT = 'https://www.shopier.com/ShowProduct/api_pay4.php';

async function getConfigs(base44) {
  const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
  const get = (key, fallback = '') => configs.find((c) => c.key === key)?.value ?? fallback;
  return {
    apiKey: get('shopier_api_key'),
    secret: get('shopier_secret'),
    websiteIndex: get('shopier_website_index', '1'),
    mode: get('shopier_mode', 'live'),
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(base44, 'shopier-pay:' + user.id, user.id, 5, 60000);
    if (!rl.allowed) return Response.json({ error: 'çok fazla istek' }, { status: 429 });

    const cfg = await getConfigs(base44);
    if (!cfg.apiKey || !cfg.secret) {
      return Response.json({ error: 'Shopier ayarları eksik — admin panelinden yapılandırın' }, { status: 503 });
    }

    const me = await base44.asServiceRole.entities.User.get(user.id);
    // Admin/moderator bypass — zaten erişimi var
    if (me.role === 'admin' || me.role === 'moderator') {
      return Response.json({ error: 'yetkili kullanıcılar ödeme yapamaz' }, { status: 403 });
    }

    const PLAN_NAME = '1 Aylık Abonelik';
    const PLAN_PRICE = 50;
    const DURATION_DAYS = 30;

    // Benzersiz sipariş ID
    const orderId = 'FK' + Date.now() + Math.floor(Math.random() * 1000);
    const randomNr = Math.floor(Math.random() * 1000000).toString();

    // Ödeme kaydı oluştur (pending)
    const payment = await base44.asServiceRole.entities.Payment.create({
      user_id: user.id,
      user_name: me.username || me.full_name || user.email,
      package_name: PLAN_NAME,
      amount: PLAN_PRICE,
      status: 'pending',
      provider: 'shopier',
      shopier_order_id: orderId,
      currency: 'TRY',
    });

    // Shopier form parametreleri
    const buyerName = (me.username || me.full_name || '').split(' ')[0] || 'Kullanıcı';
    const buyerSurname = (me.username || me.full_name || '').split(' ').slice(1).join(' ') || ' ';
    const accountAge = me.created_date
      ? Math.max(1, Math.floor((Date.now() - new Date(me.created_date).getTime()) / 86400000))
      : 1;

    const args = {
      API_key: cfg.apiKey,
      website_index: cfg.websiteIndex,
      platform_order_id: orderId,
      product_name: PLAN_NAME,
      product_type: 1, // dijital
      buyer_name: buyerName,
      buyer_surname: buyerSurname,
      buyer_email: user.email,
      buyer_account_age: accountAge.toString(),
      buyer_id_nr: user.id,
      buyer_phone: me.phone || '',
      billing_address: ' ',
      billing_city: ' ',
      billing_country: 'TR',
      billing_postcode: ' ',
      shipping_address: ' ',
      shipping_city: ' ',
      shipping_country: 'TR',
      shipping_postcode: ' ',
      total_order_value: PLAN_PRICE.toString(),
      currency: '0', // TRY = 0
      platform: '0',
      is_in_frame: '0',
      current_language: '0',
      modul_version: '1.0.8',
      random_nr: randomNr,
    };

    // İmza: HMAC-SHA256(random_nr + platform_order_id + total_order_value + currency, secret) → base64
    const data = args.random_nr + args.platform_order_id + args.total_order_value + args.currency;
    const keyData = new TextEncoder().encode(cfg.secret);
    const msgData = new TextEncoder().encode(data);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
    args.signature = signature;

    await logSecurity(base44, 'shopier_payment_init', user, orderId, 'info');

    return Response.json({
      endpoint: SHOPIER_ENDPOINT,
      args,
      order_id: orderId,
      payment_id: payment.id,
      plan: { name: PLAN_NAME, price: PLAN_PRICE, duration_days: DURATION_DAYS },
    });
  } catch (e) {
    return safeErrorResponse(e);
  }
}