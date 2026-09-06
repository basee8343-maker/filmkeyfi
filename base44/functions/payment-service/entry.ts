import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Oturum gerekli' }, { status: 401 });
    const body = await req.json();
    const action = body.action;

    // === ÖDEME YÖNTEMLERİNİ GETİR (herkes erişebilir, gizli bilgi yok) ===
    if (action === 'get_available_methods') {
      const methods = await base44.asServiceRole.entities.PaymentMethod.filter({ enabled: true }, 'sort_order', 50);
      let configs = [];
      try { configs = await base44.asServiceRole.entities.PaymentProviderConfig.list('-updated_date', 50); } catch {}
      const result = methods.map((m) => {
        const required = m.required_fields || [];
        // Zorunlu alanlar seçilmişse, hepsi dolu olmalı; yoksa varsayılan kontrol
        if (required.length > 0) {
          for (const field of required) {
            if (field === 'merchant_key' || field === 'merchant_salt') {
              const cfg = configs.find((c) => c.provider_key === m.provider_key);
              if (!cfg || !cfg[field]) return null;
            } else {
              if (!m[field]) return null;
            }
          }
        } else {
          // Varsayılan: banka transferi için temel alanlar gerekli
          if (m.type === 'bank_transfer' && (!m.iban || !m.bank_name || !m.account_holder)) return null;
        }
        if (m.type === 'bank_transfer') {
          return {
            provider_key: m.provider_key, display_name: m.display_name, type: m.type,
            sort_order: m.sort_order, description: m.description,
            bank_name: m.bank_name, account_holder: m.account_holder,
            iban: m.iban, branch: m.branch, payment_instructions: m.payment_instructions,
          };
        }
        return {
          provider_key: m.provider_key, display_name: m.display_name, type: m.type,
          sort_order: m.sort_order, description: m.description,
          merchant_id: m.merchant_id, test_mode: m.test_mode,
        };
      }).filter(Boolean);
      return Response.json({ data: result });
    }

    // === BANKA TRANSFERİ ÖDEME KAYDI OLUŞTUR ===
    if (action === 'create_bank_payment') {
      const planId = String(body.plan_id || '');
      if (!planId) return Response.json({ error: 'Paket seçilmedi' }, { status: 400 });

      // Paketi veritabanından doğrula — fiyat frontend'den değil DB'den gelir
      const plan = await base44.asServiceRole.entities.SubscriptionPlan.get(planId).catch(() => null);
      if (!plan || !plan.active) return Response.json({ error: 'Geçersiz veya pasif paket' }, { status: 400 });

      // Aynı paket için bekleyen ödeme var mı kontrol et
      const existing = await base44.asServiceRole.entities.Payment.filter({
        user_id: user.id, plan_id: planId, status: 'pending'
      }, '-created_date', 10);
      if (existing && existing.length > 0) {
        return Response.json({ error: 'Bu paket için zaten bir onay talebiniz bulunmaktadır. Admin onayını bekleyiniz.' }, { status: 400 });
      }

      // Banka transferi yöntemini kontrol et
      const bankMethods = await base44.asServiceRole.entities.PaymentMethod.filter({ provider_key: 'bank_transfer', enabled: true });
      if (!bankMethods.length || !bankMethods[0].iban || !bankMethods[0].bank_name || !bankMethods[0].account_holder) {
        return Response.json({ error: 'Banka transferi şu anda kullanılamıyor.' }, { status: 400 });
      }
      const bank = bankMethods[0];

      // Kullanıcının ödeme referans numarasını al veya oluştur
      let paymentRef = user.payment_reference;
      if (!paymentRef) {
        const freshUser = await base44.asServiceRole.entities.User.get(user.id).catch(() => null);
        paymentRef = freshUser?.payment_reference || '';
      }
      if (!paymentRef) {
        for (let i = 0; i < 12; i++) {
          const candidate = String(Math.floor(10000000 + Math.random() * 90000000));
          const existing = await base44.asServiceRole.entities.User.filter({ payment_reference: candidate }, null, 1);
          if (!existing || existing.length === 0) { paymentRef = candidate; break; }
        }
        if (paymentRef) {
          await base44.asServiceRole.entities.User.update(user.id, { payment_reference: paymentRef }).catch(() => {});
        }
      }

      // İşlem numarası oluştur
      const transactionId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const payment = await base44.asServiceRole.entities.Payment.create({
        user_id: user.id,
        user_name: user.username || user.full_name || user.email,
        user_email: user.email,
        payment_reference: paymentRef || '',
        plan_id: plan.id, plan_name: plan.name,
        amount: plan.price,
        payment_method: 'bank_transfer', payment_method_name: 'Banka Transferi',
        status: 'pending', transaction_id: transactionId,
        bank_name: bank.bank_name, account_holder: bank.account_holder, iban: bank.iban,
        currency: 'TRY',
      });

      return Response.json({ data: { payment, payment_reference: paymentRef, message: 'Ödeme bildiriminiz başarıyla oluşturuldu. Admin onayından sonra hesabınız ve seçtiğiniz abonelik aktifleşecektir.' } });
    }

    // === ÖDEME ONAYLA (admin) ===
    if (action === 'approve_payment') {
      if (user.role !== 'admin') return Response.json({ error: 'Yetkisiz' }, { status: 403 });
      const paymentId = String(body.payment_id || '');
      if (!paymentId) return Response.json({ error: 'Ödeme ID gerekli' }, { status: 400 });

      const payment = await base44.asServiceRole.entities.Payment.get(paymentId).catch(() => null);
      if (!payment) return Response.json({ error: 'Ödeme bulunamadı' }, { status: 404 });
      if (payment.status !== 'pending') return Response.json({ error: 'Bu ödeme zaten işlenmiş' }, { status: 400 });

      const plan = await base44.asServiceRole.entities.SubscriptionPlan.get(payment.plan_id).catch(() => null);
      if (!plan) return Response.json({ error: 'Paket bulunamadı' }, { status: 400 });

      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + (plan.duration_days || 30));

      // Abonelik oluştur
      const subscription = await base44.asServiceRole.entities.Subscription.create({
        user_id: payment.user_id, user_name: payment.user_name,
        plan_id: plan.id, plan_name: plan.name, price: payment.amount,
        start_date: now.toISOString(), end_date: end.toISOString(),
        status: 'active', payment_id: payment.id,
      });

      // Ödemeyi onayla
      await base44.asServiceRole.entities.Payment.update(paymentId, {
        status: 'approved', approved_at: now.toISOString(),
        approved_by: user.id, subscription_id: subscription.id,
      });

      // Kullanıcı üyeliğini aktifleştir
      await base44.asServiceRole.entities.User.update(payment.user_id, {
        membership_status: 'active', membership_end: end.toISOString(),
      }).catch(() => {});

      // Kullanıcıya bildirim gönder
      await base44.asServiceRole.entities.Notification.create({
        user_id: payment.user_id, title: 'Ödemeniz Onaylandı',
        body: 'Aboneliğiniz aktif edildi. İyi seyirler!',
        type: 'success', read: false,
      }).catch(() => {});

      return Response.json({ data: { success: true, subscription } });
    }

    // === ÖDEME REDDET (admin) ===
    if (action === 'reject_payment') {
      if (user.role !== 'admin') return Response.json({ error: 'Yetkisiz' }, { status: 403 });
      const paymentId = String(body.payment_id || '');
      const reason = String(body.reason || 'Ödeme doğrulanamadı.');
      if (!paymentId) return Response.json({ error: 'Ödeme ID gerekli' }, { status: 400 });

      const payment = await base44.asServiceRole.entities.Payment.get(paymentId).catch(() => null);
      if (!payment) return Response.json({ error: 'Ödeme bulunamadı' }, { status: 404 });
      if (payment.status !== 'pending') return Response.json({ error: 'Bu ödeme zaten işlenmiş' }, { status: 400 });

      await base44.asServiceRole.entities.Payment.update(paymentId, {
        status: 'rejected', rejection_reason: reason,
      });

      await base44.asServiceRole.entities.Notification.create({
        user_id: payment.user_id, title: 'Ödeme Talebiniz Reddedildi',
        body: reason, type: 'error', read: false,
      }).catch(() => {});

      return Response.json({ data: { success: true } });
    }

    // === SHOPIER ÖDEMESİ BAŞLAT (SubscriptionPlan ile) ===
    if (action === 'create_shopier_payment') {
      const planId = String(body.plan_id || '');
      if (!planId) return Response.json({ error: 'Paket seçilmedi' }, { status: 400 });

      const plan = await base44.asServiceRole.entities.SubscriptionPlan.get(planId).catch(() => null);
      if (!plan || !plan.active) return Response.json({ error: 'Geçersiz veya pasif paket' }, { status: 400 });

      // Admin/moderator ödeme yapamaz
      if (user.role === 'admin' || user.role === 'moderator') {
        return Response.json({ error: 'yetkili kullanıcılar ödeme yapamaz' }, { status: 403 });
      }

      // Aynı paket için bekleyen Shopier ödemesi var mı kontrol et
      const existing = await base44.asServiceRole.entities.Payment.filter({
        user_id: user.id, plan_id: planId, status: 'pending', provider: 'shopier'
      }, '-created_date', 5);
      if (existing && existing.length > 0) {
        // Mevcut ödemeyle devam et — aynı formu tekrar oluştur
        const existingPayment = existing[0];
      }

      // Shopier yapılandırmasını kontrol et
      const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
      const getCfg = (key, fallback = '') => configs.find((c) => c.key === key)?.value ?? fallback;
      const apiKey = getCfg('shopier_api_key');
      const secret = getCfg('shopier_secret');
      const websiteIndex = getCfg('shopier_website_index', '1');
      if (!apiKey || !secret) {
        return Response.json({ error: 'Shopier ödeme ayarları eksik. Lütfen daha sonra tekrar deneyin.' }, { status: 503 });
      }

      const me = await base44.asServiceRole.entities.User.get(user.id).catch(() => user);

      // İşlem numarası oluştur
      const orderId = 'FK' + Date.now() + Math.floor(Math.random() * 1000);

      // Pending ödeme kaydı oluştur
      const payment = await base44.asServiceRole.entities.Payment.create({
        user_id: user.id,
        user_name: me.username || me.full_name || user.email,
        user_email: user.email,
        plan_id: plan.id,
        plan_name: plan.name,
        package_name: plan.name,
        amount: plan.price,
        payment_method: 'shopier',
        payment_method_name: 'Shopier',
        provider: 'shopier',
        shopier_order_id: orderId,
        status: 'pending',
        currency: 'TRY',
      });

      // Shopier API form parametreleri oluştur
      const SHOPIER_ENDPOINT = 'https://www.shopier.com/ShowProduct/api_pay4.php';
      const randomNr = Math.floor(Math.random() * 1000000).toString();
      const buyerName = (me.username || me.full_name || '').split(' ')[0] || 'Kullanıcı';
      const buyerSurname = (me.username || me.full_name || '').split(' ').slice(1).join(' ') || ' ';
      const accountAge = me.created_date
        ? Math.max(1, Math.floor((Date.now() - new Date(me.created_date).getTime()) / 86400000))
        : 1;

      const args = {
        API_key: apiKey,
        website_index: websiteIndex,
        platform_order_id: orderId,
        product_name: plan.name,
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
        total_order_value: plan.price.toString(),
        currency: '0',
        platform: '0',
        is_in_frame: '0',
        current_language: '0',
        modul_version: '1.0.8',
        random_nr: randomNr,
      };

      const data = args.random_nr + args.platform_order_id + args.total_order_value + args.currency;
      const keyData = new TextEncoder().encode(secret);
      const msgData = new TextEncoder().encode(data);
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
      args.signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

      return Response.json({
        data: {
          endpoint: SHOPIER_ENDPOINT,
          args,
          order_id: orderId,
          payment_id: payment.id,
          plan: { name: plan.name, price: plan.price, duration_days: plan.duration_days },
        }
      });
    }

    // === KULLANICININ AKTİF ABONELİĞİNİ GETİR ===
    if (action === 'get_my_subscription') {
      const subs = await base44.asServiceRole.entities.Subscription.filter(
        { user_id: user.id, status: 'active' }, '-created_date', 5
      );
      const pendingPayments = await base44.asServiceRole.entities.Payment.filter(
        { user_id: user.id, status: 'pending' }, '-created_date', 10
      );
      return Response.json({ data: { subscription: subs?.[0] || null, pendingPayments: pendingPayments || [] } });
    }

    return Response.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}