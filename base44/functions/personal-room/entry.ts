import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const owner_name = user.username || user.full_name || 'Kullanıcı';

    // Kullanıcının kişisel odası var mı kontrol et
    const existing = await base44.asServiceRole.entities.Room.filter({
      is_personal: true, owner_id: user.id, status: 'active'
    }, '-created_date', 1).catch(() => []);

    if (existing[0]) {
      return Response.json({ id: existing[0].id });
    }

    // Yeni kişisel oda oluştur
    const room = await base44.asServiceRole.entities.Room.create({
      name: `${owner_name}'in Odası`,
      movie_id: '',
      movie_title: '',
      owner_id: user.id,
      owner_name,
      is_personal: true,
      room_number: 0,
      max_users: 10,
      chat_enabled: true,
      voice_enabled: false,
      is_playing: false,
      current_time: 0,
      status: 'active',
      hidden: false,
      room_moderators: [],
      participants: [{ user_id: user.id, name: owner_name, avatar: user.avatar || '', muted: false, speaking: false }]
    });

    await base44.asServiceRole.entities.RoomMessage.create({
      room_id: room.id, user_id: user.id, user_name: owner_name,
      text: `${owner_name} kişisel odasını açtı.`, type: 'system'
    });

    return Response.json({ id: room.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}