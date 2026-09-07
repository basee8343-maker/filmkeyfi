import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { rateLimit, logSecurity, safeErrorResponse } from '../../shared/security.ts';

// Kullanıcı adı ile giriş desteği.
// GÜVENLİK: E-posta adresi YALNIZCA doğru şifre gönderildiğinde döner.
// Böylece kullanıcı adı bilen biri e-posta adreslerini toplayamaz (enumeration koruması).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || '').trim().slice(0, 60);
    const password = String(body.password || '');
    if (!username || !password) {
      return Response.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 });
    }

    // IP bazlı sıkı hız limiti — deneme yanılma ve toplama saldırılarını engeller
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip') || 'unknown';
    const rl = await rateLimit(base44, 'lookup-username:' + ip, '', 10, 600000);
    if (!rl.allowed) {
      return Response.json({ error: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.' }, { status: 429 });
    }

    // Kullanıcı adını çöz — tam eşleşme, ardından küçük/büyük harf duyarsız eşleşme
    const lowered = username.toLowerCase();
    let target = (await base44.asServiceRole.entities.User.filter({ username }, 'created_date', 2).catch(() => []))[0] || null;
    if (!target) {
      const candidates = await base44.asServiceRole.entities.User.filter(
        { username: { $regex: `^${lowered.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
        'created_date', 2
      ).catch(() => []);
      target = candidates[0] || null;
    }

    // Kullanıcı yok VEYA şifre hatalı → aynı genel hata (hangisi olduğunu sızdırma)
    const invalid = () => Response.json({ error: 'Geçersiz kullanıcı adı veya şifre' }, { status: 401 });
    if (!target?.email) return invalid();

    // Şifreyi platform üzerinde doğrula — doğrulanmadan e-posta DÖNMEZ
    let verified = false;
    try {
      await base44.auth.loginViaEmailPassword(target.email, password);
      verified = true;
    } catch {
      verified = false;
    }

    if (!verified) {
      await logSecurity(base44, 'username_lookup_failed', { id: target.id, email: '' }, `ip: ${ip}`, 'warning').catch(() => {});
      return invalid();
    }

    return Response.json({ email: target.email });
  } catch (e) {
    return safeErrorResponse(e);
  }
}