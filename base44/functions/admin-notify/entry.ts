import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { rateLimit, safeErrorResponse, sanitizeText } from '../../shared/security.ts';
import { sendPushToAdmins } from '../../shared/webPush.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { event, ref_id, title, body: msgBody, link } = body || {};

    if (!event || !title) return Response.json({ error: 'eksik bilgi' }, { status: 400 });

    // Rate limit: 20 bildirim / dakika / kullanıcı
    const rl = await rateLimit(base44, 'admin-notify:' + user.id, user.id, 20, 60000);
    if (!rl.allowed) return Response.json({ error: 'rate limited' }, { status: 429 });

    const dedupRefId = ref_id || `${event}:${user.id}:${Date.now()}`;

    // Dedup: aynı ref_id için tekrar bildirme
    if (ref_id) {
      const existing = await base44.asServiceRole.entities.Notification.filter({ ref_id: dedupRefId }, '-created_date', 1).catch(() => []);
      if (existing && existing.length > 0) return Response.json({ ok: true, duplicate: true });
    }

    // Tüm admin kullanıcılarını bul
    const allUsers = await base44.asServiceRole.entities.User.list(500);
    const adminUsers = allUsers.filter(u => u.role === 'admin');

    const cleanTitle = sanitizeText(title, 200);
    const cleanBody = sanitizeText(msgBody || '', 500);
    const cleanLink = sanitizeText(link || '', 200);

    // Her admin için bildirim oluştur
    for (const admin of adminUsers) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        title: cleanTitle,
        body: cleanBody,
        type: event,
        link: cleanLink,
        ref_id: dedupRefId,
      }).catch(() => {});
    }

    // Admin'lere Web Push gönder (panel kapalıyken cihaza gider)
    const pushed = await sendPushToAdmins(base44, cleanTitle, cleanBody, cleanLink);

    return Response.json({ ok: true, admins: adminUsers.length, pushed });
  } catch (e) {
    return safeErrorResponse(e);
  }
}