import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { rateLimit, safeErrorResponse, logSecurity } from '../../shared/security.ts';

async function sha256Hex(salt, pw) {
  const data = new TextEncoder().encode(salt + pw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function updatePresenceRoom(base44, userId, roomId) {
  const records = await base44.asServiceRole.entities.UserPresence.filter({ user_id: userId }, '-created_date', 1).catch(() => []);
  if (records[0]) await base44.asServiceRole.entities.UserPresence.update(records[0].id, { current_room_id: roomId || '' }).catch(() => {});
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { action, room_id, password, target_id } = body || {};
    if (!room_id || !['join', 'leave', 'kick', 'set-password', 'toggle-hidden', 'toggle-voice', 'toggle-mute', 'toggle-chat', 'change-movie'].includes(action)) {
      return Response.json({ error: 'invalid request' }, { status: 400 });
    }
    const name = user.username || user.full_name || 'Kullanıcı';
    const room = await base44.asServiceRole.entities.Room.get(room_id);
    if (!room) return Response.json({ error: 'oda bulunamadı' }, { status: 404 });
    if (room.status === 'closed') return Response.json({ error: 'closed' }, { status: 403 });

    const me = await base44.asServiceRole.entities.User.get(user.id);
    const isAdmin = me.role === 'admin';
    const isMod = me.role === 'admin' || me.role === 'moderator';
    const isOwner = room.owner_id === user.id;
    const ghost = isAdmin && !isOwner;

    if (action === 'join') {
      // Rate limit: 10 katılım / dakika / kullanıcı
      const rlJoin = await rateLimit(base44, 'room-join:' + user.id, user.id, 10, 60000);
      if (!rlJoin.allowed) return Response.json({ error: 'çok hızlı katılım denemesi' }, { status: 429 });
      if (me.membership_status !== 'active' && !isMod) {
        await base44.asServiceRole.entities.SecurityLog.create({
          action: 'room_join_denied', user_id: user.id, user_email: user.email,
          detail: 'membership inactive', level: 'warning'
        });
        return Response.json({ error: 'üyelik aktif değil' }, { status: 403 });
      }
      if (!isOwner) {
        const blockedRelations = await base44.asServiceRole.entities.Friendship.filter({
          $or: [
            { requester_id: user.id, recipient_id: room.owner_id, status: 'blocked' },
            { requester_id: room.owner_id, recipient_id: user.id, status: 'blocked' }
          ]
        }, '-created_date', 1);
        if (blockedRelations.length) {
          return Response.json({ error: 'Bu odanın sahibiyle aranızda engel bulunduğu için odaya katılamazsınız.' }, { status: 403 });
        }
      }
      // Admin ghost mode: görünmez katılım
      if (ghost) return Response.json({ ok: true, ghost: true });
      const participants = room.participants || [];
      const already = participants.some((p) => p.user_id === user.id);
      if (!already && room.password && !isOwner && !isMod) {
        const [salt, hash] = room.password.split(':');
        if (!password || !salt || hash !== await sha256Hex(salt, password)) {
          await base44.asServiceRole.entities.SecurityLog.create({
            action: 'room_password_failed', user_id: user.id, user_email: user.email,
            detail: room_id, level: 'warning'
          });
          return Response.json({ error: 'hatalı şifre', needsPassword: true }, { status: 403 });
        }
      }
      if (!already) {
        if (participants.length >= (room.max_users || 10)) {
          return Response.json({ error: 'oda dolu' }, { status: 403 });
        }
        participants.push({ user_id: user.id, name, avatar: user.avatar || '', muted: false, speaking: false });
        await base44.asServiceRole.entities.Room.update(room_id, { participants });
        await base44.asServiceRole.entities.RoomMessage.create({
          room_id, user_id: user.id, user_name: name,
          text: `${name} odaya katıldı.`, type: 'system'
        });
      }
      await updatePresenceRoom(base44, user.id, room_id);
      return Response.json({ ok: true });
    }

    if (action === 'kick') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const targetUser = await base44.asServiceRole.entities.User.get(target_id).catch(() => null);
      const targetIsMod = targetUser?.role === 'admin' || targetUser?.role === 'moderator';
      if (targetIsMod && !isMod) return Response.json({ error: 'yetkili kullanıcı atılamaz' }, { status: 403 });
      const participants = (room.participants || []).filter((p) => p.user_id !== target_id);
      const targetName = (room.participants || []).find((p) => p.user_id === target_id)?.name || 'Kullanıcı';
      if (participants.length === 0) {
        await base44.asServiceRole.entities.Room.update(room_id, { participants, status: 'closed', is_playing: false });
        await base44.asServiceRole.entities.RoomMessage.create({
          room_id, user_id: target_id, user_name: targetName,
          text: `${targetName} odadan atıldı.`, type: 'system'
        });
        return Response.json({ ok: true });
      }
      await base44.asServiceRole.entities.Room.update(room_id, { participants });
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: target_id, user_name: targetName,
        text: `${targetName} odadan atıldı.`, type: 'system'
      });
      return Response.json({ ok: true });
    }

    if (action === 'set-password') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      if (!password) {
        await base44.asServiceRole.entities.Room.update(room_id, { password: '' });
        return Response.json({ ok: true });
      }
      const salt = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
      const hash = await sha256Hex(salt, password);
      await base44.asServiceRole.entities.Room.update(room_id, { password: `${salt}:${hash}` });
      return Response.json({ ok: true });
    }

    if (action === 'toggle-hidden') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.Room.update(room_id, { hidden: !room.hidden });
      return Response.json({ ok: true, hidden: !room.hidden });
    }

    if (action === 'toggle-voice') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.Room.update(room_id, { voice_enabled: !room.voice_enabled });
      return Response.json({ ok: true, voice_enabled: !room.voice_enabled });
    }

    if (action === 'toggle-chat') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.Room.update(room_id, { chat_enabled: !room.chat_enabled });
      return Response.json({ ok: true, chat_enabled: !room.chat_enabled });
    }

    if (action === 'toggle-mute') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const participants = (room.participants || []).map((p) =>
        p.user_id === target_id ? { ...p, muted: !p.muted } : p
      );
      await base44.asServiceRole.entities.Room.update(room_id, { participants });
      return Response.json({ ok: true });
    }

    if (action === 'change-movie') {
      const { movie_id, movie_title } = body || {};
      if (!movie_id) return Response.json({ error: 'film gerekli' }, { status: 400 });
      const participants = room.participants || [];
      const inRoom = participants.some((p) => p.user_id === user.id);
      if (!inRoom && !isOwner && !isMod) return Response.json({ error: 'odada değilsiniz' }, { status: 403 });
      await base44.asServiceRole.entities.Room.update(room_id, {
        movie_id, movie_title: movie_title || '',
        current_time: 0, is_playing: true,
        last_sync: new Date().toISOString()
      });
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: user.id, user_name: name,
        text: `${name} filmi değiştirdi: ${movie_title || 'Yeni Film'}`, type: 'system'
      });
      return Response.json({ ok: true });
    }

    // leave
    if (ghost) return Response.json({ ok: true });
    await updatePresenceRoom(base44, user.id, '');
    const participants = (room.participants || []).filter((p) => p.user_id !== user.id);
    if (participants.length === 0) {
      await base44.asServiceRole.entities.Room.update(room_id, { participants, status: 'closed', is_playing: false });
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: user.id, user_name: name,
        text: `${name} odadan ayrıldı.`, type: 'system'
      });
      return Response.json({ ok: true });
    }
    let owner_id = room.owner_id;
    let owner_name = room.owner_name;
    const ownershipTransferred = isOwner && participants.length > 0;
    if (ownershipTransferred) {
      owner_id = participants[0].user_id;
      owner_name = participants[0].name;
    }
    await base44.asServiceRole.entities.Room.update(room_id, {
      participants, owner_id, owner_name,
      // Oynatma durumunu koru — yeni sahip kesintisiz devam etsin
      is_playing: ownershipTransferred ? room.is_playing : (participants.length === 0 ? false : room.is_playing),
      last_sync: new Date().toISOString()
    });
    await base44.asServiceRole.entities.RoomMessage.create({
      room_id, user_id: user.id, user_name: name,
      text: `${name} odadan ayrıldı.`, type: 'system'
    });
    if (ownershipTransferred) {
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: owner_id, user_name: owner_name,
        text: `${owner_name} yeni oda sahibi oldu.`, type: 'system'
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: owner_id,
        title: 'Oda sahipliği size devredildi',
        body: `${room.name} odasının yeni sahibi sizsiniz.`,
        type: 'room',
        link: `/oda/${room_id}`
      }).catch(() => {});
    }
    return Response.json({ ok: true });
  } catch (e) {
    return safeErrorResponse(e);
  }
}