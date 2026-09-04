import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { safeErrorResponse } from '../../shared/security.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { room_id } = body || {};
    if (!room_id) return Response.json({ error: 'room_id gerekli' }, { status: 400 });

    const room = await base44.asServiceRole.entities.Room.get(room_id);
    if (!room) return Response.json({ error: 'oda bulunamadı' }, { status: 404 });

    const me = await base44.asServiceRole.entities.User.get(user.id);
    const isMod = me.role === 'admin' || me.role === 'moderator';
    const isParticipant = (room.participants || []).some((p) => p.user_id === user.id);
    if (room.owner_id !== user.id && !isMod && !isParticipant) {
      return Response.json({ error: 'yetkisiz' }, { status: 403 });
    }

    const res = await base44.asServiceRole.entities.RoomMessage.deleteMany({ room_id });
    return Response.json({ deleted: res?.deleted_count ?? 0 });
  } catch (e) {
    return safeErrorResponse(e);
  }
}