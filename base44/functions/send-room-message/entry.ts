import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sanitizeText, rateLimit, safeErrorResponse, logSecurity } from '../../shared/security.ts';
import { findProfanity } from '../../shared/profanity.ts';
import { advanceRoomLevel } from '../../shared/roomLevels.ts';
import { awardMessageXp } from '../../shared/xp.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { room_id, text } = body || {};
    if (!room_id || !text || typeof text !== 'string') {
      return Response.json({ error: 'invalid' }, { status: 400 });
    }
    if (text.length > 1000) return Response.json({ error: 'mesaj çok uzun' }, { status: 400 });

    // IDOR koruması: kullanıcının oda katılımcısı olduğunu doğrula
    const room = await base44.asServiceRole.entities.Room.get(room_id).catch(() => null);
    if (!room) return Response.json({ error: 'oda bulunamadı' }, { status: 404 });
    const me = await base44.asServiceRole.entities.User.get(user.id);
    const isMod = me.role === 'admin' || me.role === 'moderator';
    const isOwner = room.owner_id === user.id;
    const isParticipant = (room.participants || []).some((p) => p.user_id === user.id);
    if (!isParticipant && !isOwner && !isMod) {
      await logSecurity(base44, 'room_msg_denied', user, 'not participant: ' + room_id, 'warning');
      return Response.json({ error: 'bu odada mesaj gönderemezsiniz' }, { status: 403 });
    }

    // Sohbet kapalıysa sadece admin/moderator mesaj gönderebilir
    if (!room.chat_enabled && !isMod) {
      return Response.json({ error: 'sohbet kapalı' }, { status: 403 });
    }

    // Rate limit: 15 mesaj / 30 saniye / kullanıcı (admin/mod muaf)
    if (!isMod) {
      const key = 'chat:' + user.id;
      const rl = await rateLimit(base44, key, user.id, 15, 30000);
      if (!rl.allowed) {
        return Response.json({ error: 'çok hızlı mesaj gönderiyorsunuz' }, { status: 429 });
      }
    }

    // XSS sanitizasyonu
    const clean = sanitizeText(text, 1000);
    if (!clean) return Response.json({ error: 'boş mesaj' }, { status: 400 });
    const name = user.username || user.full_name || 'Kullanıcı';
    // Küfür/argo filtresi — mesajı engeller, yönetici paneline düşürür
    const badWords = isMod ? [] : findProfanity(clean);
    if (badWords.length) {
      await base44.asServiceRole.entities.Report.create({
        reporter_id: user.id, reporter_name: name,
        target_id: user.id, target_name: name,
        context: 'room', context_id: room_id,
        reason: `Küfür/Argo filtre: "${clean}" (${badWords.join(', ')})`,
        status: 'pending'
      }).catch(() => {});
      return Response.json({ error: 'Mesajınız uygunsuz içerik tespit edildiği için engellendi.', filtered: true }, { status: 400 });
    }
    const created = await base44.asServiceRole.entities.RoomMessage.create({
      room_id, user_id: user.id, user_name: name, user_avatar: user.avatar || '',
      text: clean, type: 'user'
    });
    // Arka planda XP kazanımı — kullanıcı arayüzünde mesaj sayısı gösterilmez.
    try { await awardMessageXp(base44, user.id, name, created.id); } catch {}
    // Tek kalıcı seviye yalnızca özel odalarda ilerler; tüm oda türlerinde aynı değer görünür.
    if (room.is_personal) {
      try {
        const progress = await advanceRoomLevel(base44, user.id, name);
        if (progress.leveledUp) {
          await base44.asServiceRole.entities.RoomMessage.create({ room_id, user_id: user.id, user_name: name, text: `🎉 ${name} ${progress.level} lvl oldu! Tebrikler!`, type: 'system' });
        }
      } catch {}
    }
    return Response.json({ ok: true });
  } catch (e) {
    return safeErrorResponse(e);
  }
}