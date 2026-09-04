import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ONLINE_THRESHOLD_MS = 60000; // 1 dakika içinde aktif olan çevrim içi sayılır

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Doğrudan çağrıyı engelle: auth varsa admin olmalı, yoksa (workflow) devam et
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin' && user.role !== 'moderator') {
        return Response.json({ error: 'yetkisiz' }, { status: 403 });
      }
    } catch {
      // auth yok — workflow çağrısı, devam et
    }

    const rooms = await base44.asServiceRole.entities.Room.filter({ status: 'active' }, '-created_date', 500);
    let closedCount = 0;
    let transferredCount = 0;

    for (const room of rooms) {
      if (room.is_personal) continue; // Kişisel odaları kapatma
      const participants = room.participants || [];
      if (participants.length === 0) {
        await base44.asServiceRole.entities.Room.update(room.id, { status: 'closed', is_playing: false });
        closedCount++;
        continue;
      }

      // Her katılımcının çevrim içi durumunu kontrol et
      const onlineParticipantIds = [];
      for (const p of participants) {
        const presence = await base44.asServiceRole.entities.UserPresence.filter({ user_id: p.user_id }, '-created_date', 1).catch(() => []);
        const rec = presence[0];
        if (rec && rec.online && rec.last_seen && Date.now() - new Date(rec.last_seen).getTime() < ONLINE_THRESHOLD_MS) {
          onlineParticipantIds.push(p.user_id);
        }
      }

      if (onlineParticipantIds.length === 0) {
        // Çevrim içi kimse yok — odayı kapat
        await base44.asServiceRole.entities.Room.update(room.id, { status: 'closed', is_playing: false });
        closedCount++;
      } else {
        // Oda sahibi çevrim dışı mı? Çevrim içi katılımcıya devret
        const ownerOnline = onlineParticipantIds.includes(room.owner_id);
        if (!ownerOnline) {
          const newOwner = participants.find((p) => onlineParticipantIds.includes(p.user_id));
          if (newOwner) {
            await base44.asServiceRole.entities.Room.update(room.id, {
              owner_id: newOwner.user_id,
              owner_name: newOwner.name,
              last_sync: new Date().toISOString()
            });
            transferredCount++;
            await base44.asServiceRole.entities.RoomMessage.create({
              room_id: room.id, user_id: newOwner.user_id, user_name: newOwner.name,
              text: `${newOwner.name} yeni oda sahibi oldu.`, type: 'system'
            }).catch(() => {});
            await base44.asServiceRole.entities.Notification.create({
              user_id: newOwner.user_id,
              title: 'Oda sahipliği size devredildi',
              body: `${room.name} odasının yeni sahibi sizsiniz.`,
              type: 'room',
              link: `/oda/${room.id}`
            }).catch(() => {});
          }
        }
      }
    }

    return Response.json({ ok: true, checked: rooms.length, closed: closedCount, transferred: transferredCount });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}