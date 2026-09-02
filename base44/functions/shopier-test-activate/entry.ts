import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logSecurity, safeErrorResponse } from '../../shared/security.ts';

// TEST MODU — admin tarafından gerçek ödeme yapmadan abonelik aktivasyon akışını test etmek için
// Gerçek webhook ile aynı aktivasyon mantığını çalıştırır, ancak Payment kaydına "shopier_test" provider'ı yazar
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || (admin.role !== 'admin' && admin.role !== 'moderator')) {
      return Response.json({ error: 'Yetkisiz — sadece admin/moderator' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, package_id } = body;
    if (!user_id) return Response.json({ error: 'user_id gerekli' }, { status: 400 });

    const user = await base44.asServiceRole.entities.User.get(user_id).catch(() => null);
    if (!user) return Response.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

    // Paket bul
    let product = null;
    if (package_id) {
      product = await base44.asServiceRole.entities.Package.get(package_id).catch(() => null);
    }
    if (!product) {
      const products = await base44.asServiceRole.entities.Package.filter({ active: true }).catch(() => []);
      product = products[0] || null;
    }

    const durationDays = product?.duration_days || 30;
    const planName = product?.name || 'Test Abonelik';
    const amount = product?.price || 50;
    const orderId = 'TEST' + Date.now() + Math.floor(Math.random() * 1000);
    const now = new Date();

    // Tamamlanmış ödeme kaydı oluştur (test)
    const payment = await base44.asServiceRole.entities.Payment.create({
      user_id: user.id,
      user_name: user.username || user.full_name || user.email,
      user_email: user.email,
      product_id: product?.id || '',
      package_name: planName,
      amount: amount,
      status: 'completed',
      provider: 'shopier_test',
      shopier_order_id: orderId,
      currency: 'TRY',
      paid_at: now.toISOString(),
    });

    // Abonelik tarihlerini hesapla (mevcut aktif abonelik varsa üzerine ekle)
    let startDate = now;
    let endDate = new Date(now.getTime() + durationDays * 86400000);
    if (user.membership_status === 'active' && user.membership_end) {
      const currentEnd = new Date(user.membership_end);
      if (currentEnd > now) {
        startDate = currentEnd;
        endDate = new Date(currentEnd.getTime() + durationDays * 86400000);
      }
    }

    // Kullanıcı aboneliğini aktif et (webhook ile aynı alanlar)
    await base44.asServiceRole.entities.User.update(user.id, {
      membership_status: 'active',
      membership_start: startDate.toISOString(),
      membership_end: endDate.toISOString(),
      subscription_status: 'ACTIVE',
      subscription_start_date: startDate.toISOString(),
      subscription_end_date: endDate.toISOString(),
      subscription_plan: planName,
      subscription_price: amount,
      package_id: product?.id || '',
      payment_provider: 'shopier_test',
      payment_id: payment.id,
      last_payment_date: now.toISOString(),
    });

    // Kullanıcıya bildirim
    await base44.asServiceRole.entities.Notification.create({
      user_id: user.id,
      title: 'Test: Aboneliğiniz aktif edildi',
      body: `${planName} — ${durationDays} gün boyunca aktif. (TEST MODU — gerçek ödeme değil)`,
      type: 'info',
    }).catch(() => {});

    // Admin log
    await base44.asServiceRole.entities.AdminLog.create({
      admin_id: admin.id,
      admin_name: admin.username || admin.full_name,
      action: 'Test ödeme ile abonelik aktif edildi',
      target: user.email,
      details: `Test sipariş: ${orderId}, Ürün: ${planName}, Süre: ${durationDays} gün`,
    }).catch(() => {});

    await logSecurity(base44, 'shopier_test_activate', admin, `User: ${user.email}, Order: ${orderId}`, 'info').catch(() => {});

    return Response.json({
      ok: true,
      user_id: user.id,
      payment_id: payment.id,
      order_id: orderId,
      plan: planName,
      amount: amount,
      duration_days: durationDays,
      end_date: endDate.toISOString(),
      message: 'Test ödeme ile abonelik aktif edildi',
    });
  } catch (e) {
    return safeErrorResponse(e);
  }
}