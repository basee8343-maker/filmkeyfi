import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { AccessToken } from 'npm:livekit-server-sdk@2.18.0';
import { secrets } from 'base44:runtime';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Oturum gerekli.' }, { status: 401 });

    const { roomName, participantName } = await req.json();
    if (typeof roomName !== 'string' || !roomName.trim() || roomName.length > 100) {
      return Response.json({ error: 'Geçersiz oda.' }, { status: 400 });
    }

    const room = await base44.entities.Room.get(roomName.trim());
    const mayJoin = room.owner_id === user.id || ['admin', 'moderator'].includes(user.role) ||
      (room.participants || []).some((participant) => participant.user_id === user.id);
    if (!mayJoin || room.status !== 'active' || !room.voice_enabled) {
      return Response.json({ error: 'Sesli odaya erişiminiz yok.' }, { status: 403 });
    }

    const livekitRoom = `filmkeyfi-${room.id}`;
    const displayName = String(participantName || user.full_name || 'Kullanıcı').trim().slice(0, 80);
    const token = new AccessToken(secrets.get('LIVEKIT_API_KEY'), secrets.get('LIVEKIT_API_SECRET'), {
      identity: user.id,
      name: displayName,
      ttl: '2h',
    });
    token.addGrant({ roomJoin: true, room: livekitRoom, canPublish: true, canSubscribe: true });

    return Response.json({
      token: await token.toJwt(),
      url: secrets.get('LIVEKIT_URL'),
      roomName: livekitRoom,
    });
  } catch (error) {
    console.error('[LiveKit Token]', error);
    return Response.json({ error: 'Ses bağlantısı hazırlanamadı.' }, { status: 500 });
  }
}