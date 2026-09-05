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
      // Eski odada kod yoksa ekle
      if (!existing[0].personal_room_code) {
        const meExisting = await base44.asServiceRole.entities.User.get(user.id).catch(() => null);
        let codeExisting = meExisting?.personal_room_code || '';
        if (!codeExisting) {
          codeExisting = String(Math.floor(10000000 + Math.random() * 90000000));
          await base44.asServiceRole.entities.User.update(user.id, { personal_room_code: codeExisting }).catch(() => {});
        }
        await base44.asServiceRole.entities.Room.update(existing[0].id, { personal_room_code: codeExisting }).catch(() => {});
      }
      return Response.json({ id: existing[0].id });
    }

    // Kullanıcının kalıcı oda kodunu al veya oluştur
    const me = await base44.asServiceRole.entities.User.get(user.id).catch(() => null);
    let personalRoomCode = me?.personal_room_code || '';
    if (!personalRoomCode) {
      personalRoomCode = String(Math.floor(10000000 + Math.random() * 90000000));
      await base44.asServiceRole.entities.User.update(user.id, { personal_room_code: personalRoomCode }).catch(() => {});
    }

    // Yeni kişisel oda oluştur
    const savedMods = await base44.asServiceRole.entities.RoomMod.filter({ owner_id: user.id }, '-created_date', 100).catch(() => []);
    const room_moderators = savedMods.map((m) => m.user_id);
    const room = await base44.asServiceRole.entities.Room.create({
      name: `${owner_name}'in Odası`,
      movie_id: '',
      movie_title: '',
      owner_id: user.id,
      owner_name,
      is_personal: true,
      room_number: 0,
      personal_room_code: personalRoomCode,
      max_users: 10,
      chat_enabled: true,
      voice_enabled: true,
      is_playing: false,
      current_time: 0,
      status: 'active',
      hidden: false,
      room_moderators,
      chat_auto_delete_minutes: 3,
      chat_auto_delete_at: new Date(Date.now() + 3 * 60000).toISOString(),
      recent_participants: [],
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