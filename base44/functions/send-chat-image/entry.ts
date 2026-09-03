import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { file_url, context, context_id, text } = body || {};
    if (!file_url || !context || !context_id) return Response.json({ error: 'eksik parametre' }, { status: 400 });
    const caption = typeof text === 'string' ? text.slice(0, 500) : '';
    const senderName = user.username || user.full_name || 'Kullanıcı';

    // Görsel moderasyonu — çıplaklık/cinsel içerik tespiti
    let safe = true;
    let reason = '';
    try {
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: 'Bu görseli incele. Görselde çıplaklık, cinsel içerik, pornografi veya uygunsuz sahne var mı? Sadece JSON döndür: { "safe": true/false, "reason": "kısa açıklama" }. Güvenli/gözlü görüntüler için safe=true.',
        file_urls: [file_url],
        response_json_schema: { type: 'object', properties: { safe: { type: 'boolean' }, reason: { type: 'string' } }, required: ['safe', 'reason'] },
        model: 'gemini_3_flash'
      });
      safe = res?.safe !== false;
      reason = res?.reason || '';
    } catch { safe = true; }

    if (!safe) {
      await base44.asServiceRole.entities.Report.create({
        reporter_id: user.id, reporter_name: senderName,
        target_id: user.id, target_name: senderName,
        context, context_id,
        reason: `Uygunsuz görsel filtre: ${reason || 'çıplaklık/cinsel içerik'}`,
        file_url, status: 'pending'
      }).catch(() => {});
      return Response.json({ error: 'Görsel uygunsuz içerik tespit edildiği için engellendi.', filtered: true }, { status: 400 });
    }

    if (context === 'room') {
      const room = await base44.asServiceRole.entities.Room.get(context_id).catch(() => null);
      if (!room) return Response.json({ error: 'oda bulunamadı' }, { status: 404 });
      const isMod = user.role === 'admin' || user.role === 'moderator';
      const isOwner = room.owner_id === user.id;
      const isParticipant = (room.participants || []).some((p) => p.user_id === user.id);
      if (!isParticipant && !isOwner && !isMod) return Response.json({ error: 'bu odada mesaj gönderemezsiniz' }, { status: 403 });
      if (!room.chat_enabled && !isMod) return Response.json({ error: 'sohbet kapalı' }, { status: 403 });
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id: context_id, user_id: user.id, user_name: senderName, user_avatar: user.avatar || '',
        text: caption, file_url, type: 'user'
      });
      return Response.json({ ok: true });
    }

    if (context === 'dm') {
      const friendship = await base44.asServiceRole.entities.Friendship.get(context_id).catch(() => null);
      if (!friendship || friendship.status !== 'accepted' || !friendship.members.includes(user.id)) {
        return Response.json({ error: 'Yalnızca arkadaşlarınıza mesaj gönderebilirsiniz' }, { status: 403 });
      }
      const recipientId = friendship.requester_id === user.id ? friendship.recipient_id : friendship.requester_id;
      const recipientName = friendship.requester_id === user.id ? friendship.recipient_name : friendship.requester_name;
      await base44.asServiceRole.entities.DirectMessage.create({
        friendship_id: context_id, sender_id: user.id, sender_name: senderName,
        recipient_id: recipientId, recipient_name: recipientName,
        participants: friendship.members, read_by: [user.id],
        text: caption, file_url
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'geçersiz bağlam' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: 'işlem başarısız' }, { status: 500 });
  }
}