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
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(base44, 'shopier-pay:' + user.id, user.id, 5, 60000);
    if (!rl.allowed) return Response.json({ error: 'çok fazla istek' }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const productId = body.product_id;
    if (!productId) return Response.json({ error: 'Ürün seçimi gerekli' }, { status: 400 });

    // Ürünü getir
    const product = await base44.asServiceRole.entities.Package.get(productId).catch(() => null);
    if (!product) return Response.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    if (!product.active) return Response.json({ error: 'Bu ürün şu anda satışta değil' }, { status: 400 });

    const me = await base44.asServiceRole.entities.User.get(user.id);
    // Admin/moderator ödeme yapamaz
    if (me.role === 'admin' || me.role === 'moderator') {
      return Response.json({ error: 'yetkili kullanıcılar ödeme yapamaz' }, { status: 403 });
    }

    // Benzersiz sipariş ID
    const orderId = 'FK' + Date.now() + Math.floor(Math.random() * 1000);

    // Pending ödeme kaydı oluştur
    const payment = await base44.asServiceRole.entities.Payment.create({
      user_id: user.id,
      user_name: me.username || me.full_name || user.email,
      user_email: user.email,
      product_id: productId,
      package_name: product.name,
      amount: product.price,
      status: 'pending',
      provider: 'shopier',
      shopier_order_id: orderId,
      currency: 'TRY',
    });

    await logSecurity(base44, 'shopier_payment_init', user, orderId, 'info');

    // YÖNTEM 1: Shopier ödeme linki — doğrudan yönlendirme
    if (product.shopier_payment_url) {
      return Response.json({
        redirect_url: product.shopier_payment_url,
        order_id: orderId,
        payment_id: payment.id,
        product: { name: product.name, price: product.price, duration_days: product.duration_days },
      });
    }

    // YÖNTEM 2: Shopier API form (fallback — ödeme linki tanımlanmamışsa)
    const cfg = await getConfigs(base44);
    if (!cfg.apiKey || !cfg.secret) {
      return Response.json({ error: 'Shopier ayarları eksik — admin panelinden ürün için ödeme linki tanımlayın veya Shopier API ayarlarını yapılandırın' }, { status: 503 });
    }

    const randomNr = Math.floor(Math.random() * 1000000).toString();
    const buyerName = (me.username || me.full_name || '').split(' ')[0] || 'Kullanıcı';
    const buyerSurname = (me.username || me.full_name || '').split(' ').slice(1).join(' ') || ' ';
    const accountAge = me.created_date
      ? Math.max(1, Math.floor((Date.now() - new Date(me.created_date).getTime()) / 86400000))
      : 1;

    const args = {
      API_key: cfg.apiKey,
      website_index: cfg.websiteIndex,
      platform_order_id: orderId,
      product_name: product.name,
      product_type: 1,
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
      total_order_value: product.price.toString(),
      currency: '0',
      platform: '0',
      is_in_frame: '0',
      current_language: '0',
      modul_version: '1.0.8',
      random_nr: randomNr,
    };

    const data = args.random_nr + args.platform_order_id + args.total_order_value + args.currency;
    const keyData = new TextEncoder().encode(cfg.secret);
    const msgData = new TextEncoder().encode(data);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    args.signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

    return Response.json({
      endpoint: SHOPIER_ENDPOINT,
      args,
      order_id: orderId,
      payment_id: payment.id,
      product: { name: product.name, price: product.price, duration_days: product.duration_days },
    });
  } catch (e) {
    return safeErrorResponse(e);
  }
}