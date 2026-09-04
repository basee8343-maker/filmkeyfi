import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { rateLimit, safeErrorResponse, logSecurity } from '../../shared/security.ts';
import { isModerator, isSiteOwner, immuneToModeration, getRoleInfo, getRoleLabelOverrides, getSpecialFrameInfo } from '../../shared/roles.ts';

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
    if (!room_id || !['get', 'join', 'leave', 'kick', 'ban', 'unban', 'set-password', 'set-name', 'toggle-hidden', 'toggle-voice', 'toggle-mute', 'toggle-chat', 'change-movie', 'assign-mod', 'remove-mod', 'delete-room', 'set-level', 'request-join', 'approve-join', 'reject-join'].includes(action)) {
      return Response.json({ error: 'invalid request' }, { status: 400 });
    }
    const name = user.username || user.full_name || 'Kullanıcı';
    const room = await base44.asServiceRole.entities.Room.get(room_id);
    if (!room) return Response.json({ error: 'oda bulunamadı' }, { status: 404 });
    if (room.status === 'closed') return Response.json({ error: 'closed' }, { status: 403 });

    if (action === 'get') {
      return Response.json({ room });
    }

    const me = await base44.asServiceRole.entities.User.get(user.id);
    const isAdmin = me.role === 'admin';
    const isMod = isModerator(me);
    const isOwner = room.owner_id === user.id;
    const isRoomMod = (room.room_moderators || []).includes(user.id);
    const canModRoom = isOwner || isMod || isRoomMod;
    const ghost = isAdmin && !isOwner;
    const labelOverrides = await getRoleLabelOverrides(base44);

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
      // Kişisel oda: sadece onaylı istek sahipleri girebilir (admin/mod hariç)
      if (room.is_personal && !isOwner && !isMod) {
        const approvedReq = await base44.asServiceRole.entities.RoomJoinRequest.filter({ room_id, user_id: user.id, status: 'approved' }, '-created_date', 1).catch(() => []);
        const hasApproved = approvedReq && approvedReq.length > 0;
        if (!hasApproved) {
          return Response.json({ error: 'Oda sahibinin onayı gerekli', needsApproval: true }, { status: 403 });
        }
      }
      // Ban check: atılmış kullanıcılar tekrar giremez
      const isBanned = (room.banned_users || []).some((b) => b.user_id === user.id);
      if (isBanned && !isMod) {
        return Response.json({ error: 'Bu odadan atılmışsınız. Tekrar katılamazsınız.' }, { status: 403 });
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
        const roleInfo = getRoleInfo(me, labelOverrides);
        const roleMeta = roleInfo.label ? `{{ROLE|${roleInfo.key || ''}|${roleInfo.color || ''}|${roleInfo.animation || 'pulse'}}}` : '';
        const frameInfo = await getSpecialFrameInfo(base44, me, true);
        const frameMeta = frameInfo ? `{{FRAME|${frameInfo.id}|${frameInfo.theme_color}|${frameInfo.text_color}|${frameInfo.glow_color}|${frameInfo.title}}}` : '';
        const titlePrefix = frameInfo?.title
          ? `${frameInfo.title} `
          : (roleInfo.label && roleInfo.show_in_room ? `${roleInfo.icon} ${roleInfo.label} ` : '');
        const entryName = frameInfo ? `${name} ` : (roleInfo.hide_username_entry ? '' : `${name} `);
        await base44.asServiceRole.entities.RoomMessage.create({
          room_id, user_id: user.id, user_name: name, user_avatar: user.avatar || '',
          text: `${frameMeta}${roleMeta}${titlePrefix}${entryName}odaya katıldı.`, type: 'system'
        });
      }
      await updatePresenceRoom(base44, user.id, room_id);
      return Response.json({ ok: true });
    }

    // Özel oda katılım isteği gönder
    if (action === 'request-join') {
      if (!room.is_personal) return Response.json({ error: 'bu oda kişisel değil' }, { status: 400 });
      if (isOwner) return Response.json({ ok: true, approved: true });
      if (isMod || isAdmin) return Response.json({ ok: true, approved: true });
      if ((room.participants || []).some((p) => p.user_id === user.id)) return Response.json({ ok: true, approved: true });
      // Zaten onaylı istek varsa direkt katıl
      const existing = await base44.asServiceRole.entities.RoomJoinRequest.filter({ room_id, user_id: user.id }, '-created_date', 5).catch(() => []);
      const approved = existing.find((r) => r.status === 'approved');
      if (approved) return Response.json({ ok: true, approved: true });
      const pending = existing.find((r) => r.status === 'pending');
      if (pending) return Response.json({ ok: true, pending: true });
      // Yeni istek oluştur
      await base44.asServiceRole.entities.RoomJoinRequest.create({
        room_id, room_name: room.name || '',
        user_id: user.id, user_name: name, user_avatar: user.avatar || '',
        owner_id: room.owner_id, status: 'pending'
      });
      // Oda sahibine bildirim
      await base44.asServiceRole.entities.Notification.create({
        user_id: room.owner_id, title: 'Oda katılım isteği',
        body: `${name} odaya katılmak istiyor.`, type: 'room', link: `/oda/${room_id}`
      }).catch(() => {});
      return Response.json({ ok: true, pending: true });
    }

    // Oda sahibi isteği onayla
    if (action === 'approve-join') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const { request_id } = body || {};
      if (!request_id) return Response.json({ error: 'istek gerekli' }, { status: 400 });
      const req = await base44.asServiceRole.entities.RoomJoinRequest.get(request_id).catch(() => null);
      if (!req || req.room_id !== room_id) return Response.json({ error: 'istek bulunamadı' }, { status: 404 });
      await base44.asServiceRole.entities.RoomJoinRequest.update(request_id, { status: 'approved' });
      // Kullanıcıya bildirim
      await base44.asServiceRole.entities.Notification.create({
        user_id: req.user_id, title: 'Oda isteği onaylandı',
        body: `${room.name || 'Oda'} sahibi katılım isteğinizi onayladı.`, type: 'room', link: `/oda/${room_id}`
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    // Oda sahibi isteği reddet
    if (action === 'reject-join') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const { request_id } = body || {};
      if (!request_id) return Response.json({ error: 'istek gerekli' }, { status: 400 });
      const req = await base44.asServiceRole.entities.RoomJoinRequest.get(request_id).catch(() => null);
      if (!req || req.room_id !== room_id) return Response.json({ error: 'istek bulunamadı' }, { status: 404 });
      await base44.asServiceRole.entities.RoomJoinRequest.update(request_id, { status: 'rejected' });
      await base44.asServiceRole.entities.Notification.create({
        user_id: req.user_id, title: 'Oda isteği reddedildi',
        body: `${room.name || 'Oda'} sahibi katılım isteğinizi reddetti.`, type: 'room', link: `/oda/${room_id}`
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'kick' || action === 'ban') {
      if (!canModRoom) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const targetUser = await base44.asServiceRole.entities.User.get(target_id).catch(() => null);
      // Yetki hiyerarşisi: site sahibi herkesi atabilir, moderator'ler sadece normal kullanıcıları
      if (isSiteOwner(targetUser)) return Response.json({ error: 'Site sahibi atılamaz' }, { status: 403 });
      const targetRoleKey = targetUser?.display_role || '';
      if (targetRoleKey === 'queen_admin' || targetRoleKey === 'admin_helper') return Response.json({ error: 'Admin kraliçesi ve admin yardımcısı atılamaz' }, { status: 403 });
      if (immuneToModeration(targetUser) && !isSiteOwner(me)) return Response.json({ error: 'Bu kullanıcıyı atamazsınız' }, { status: 403 });
      const participants = (room.participants || []).filter((p) => p.user_id !== target_id);
      const targetName = (room.participants || []).find((p) => p.user_id === target_id)?.name || 'Kullanıcı';
      // ban aksiyonunda kullanıcıyı banned_users listesine ekle
      let update: any = { participants };
      if (action === 'ban') {
        const bannedUsers = (room.banned_users || []).filter((b) => b.user_id !== target_id);
        bannedUsers.push({ user_id: target_id, name: targetName, banned_at: new Date().toISOString() });
        update.banned_users = bannedUsers;
      }
      if (participants.length === 0) {
        update.is_playing = false;
        if (!room.is_personal) update.status = 'closed';
      }
      await base44.asServiceRole.entities.Room.update(room_id, update);
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: target_id, user_name: targetName,
        text: action === 'ban' ? `${targetName} odadan atıldı ve giriş yasaklandı.` : `${targetName} odadan atıldı.`, type: 'system'
      });
      return Response.json({ ok: true });
    }

    if (action === 'unban') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const bannedUsers = (room.banned_users || []).filter((b) => b.user_id !== target_id);
      await base44.asServiceRole.entities.Room.update(room_id, { banned_users: bannedUsers });
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
      if (!canModRoom) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.Room.update(room_id, { hidden: !room.hidden });
      return Response.json({ ok: true, hidden: !room.hidden });
    }

    if (action === 'toggle-voice') {
      if (!canModRoom) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.Room.update(room_id, { voice_enabled: !room.voice_enabled });
      return Response.json({ ok: true, voice_enabled: !room.voice_enabled });
    }

    if (action === 'toggle-chat') {
      if (!canModRoom) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.Room.update(room_id, { chat_enabled: !room.chat_enabled });
      return Response.json({ ok: true, chat_enabled: !room.chat_enabled });
    }

    if (action === 'toggle-mute') {
      if (!canModRoom) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const targetUser = await base44.asServiceRole.entities.User.get(target_id).catch(() => null);
      if (immuneToModeration(targetUser) && !isSiteOwner(me)) return Response.json({ error: 'Bu kullanıcı susturulamaz' }, { status: 403 });
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
      if (!inRoom && !canModRoom) return Response.json({ error: 'odada değilsiniz' }, { status: 403 });
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

    if (action === 'set-name') {
      if (!canModRoom) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const { name: newName } = body || {};
      if (!newName || !newName.trim()) return Response.json({ error: 'isim gerekli' }, { status: 400 });
      const cleanName = newName.trim().slice(0, 80);
      await base44.asServiceRole.entities.Room.update(room_id, { name: cleanName });
      return Response.json({ ok: true });
    }

    if (action === 'assign-mod' || action === 'remove-mod') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      if (!target_id) return Response.json({ error: 'kullanıcı gerekli' }, { status: 400 });
      let mods = room.room_moderators || [];
      if (action === 'assign-mod') {
        if (!mods.includes(target_id)) mods = [...mods, target_id];
      } else {
        mods = mods.filter((id) => id !== target_id);
      }
      await base44.asServiceRole.entities.Room.update(room_id, { room_moderators: mods });
      const targetUser = await base44.asServiceRole.entities.User.get(target_id).catch(() => null);
      const targetName = targetUser?.username || targetUser?.full_name || 'Kullanıcı';
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: target_id, user_name: targetName,
        text: action === 'assign-mod' ? `${targetName} oda moderatörü yapıldı.` : `${targetName}'in oda moderatörliği kaldırıldı.`, type: 'system'
      }).catch(() => {});
      if (action === 'assign-mod') {
        await base44.asServiceRole.entities.Notification.create({
          user_id: target_id, title: 'Oda moderatörü oldunuz',
          body: `${room.name} odasında moderatör yetkisi verildi.`, type: 'room', link: `/oda/${room_id}`
        }).catch(() => {});
        const existingMods = await base44.asServiceRole.entities.RoomMod.filter({ owner_id: room.owner_id, user_id: target_id }, '-created_date', 1).catch(() => []);
        if (!existingMods[0]) {
          await base44.asServiceRole.entities.RoomMod.create({
            owner_id: room.owner_id, user_id: target_id, user_name: targetName
          }).catch(() => {});
        }
      } else {
        await base44.asServiceRole.entities.Notification.create({
          user_id: target_id, title: 'Oda moderatörliği kaldırıldı',
          body: `${room.name} odasında moderatör yetkiniz kaldırıldı.`, type: 'room', link: `/oda/${room_id}`
        }).catch(() => {});
        await base44.asServiceRole.entities.RoomMod.deleteMany({ owner_id: room.owner_id, user_id: target_id }).catch(() => {});
      }
      return Response.json({ ok: true });
    }

    if (action === 'delete-room') {
      if (!isOwner && !isAdmin) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.RoomMessage.deleteMany({ room_id }).catch(() => {});
      await base44.asServiceRole.entities.Room.delete(room_id).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'set-level') {
      if (!isOwner && !isMod) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const { target_id: tid, level: newLevel } = body || {};
      if (!tid) return Response.json({ error: 'kullanıcı gerekli' }, { status: 400 });
      const clampedLevel = Math.max(1, Math.min(100, parseInt(newLevel) || 1));
      const levels = await base44.asServiceRole.entities.RoomLevel.filter({ owner_id: room.owner_id, user_id: tid }, '-created_date', 1).catch(() => []);
      if (levels[0]) {
        await base44.asServiceRole.entities.RoomLevel.update(levels[0].id, { level: clampedLevel });
      } else {
        const targetUser = await base44.asServiceRole.entities.User.get(tid).catch(() => null);
        const targetName = targetUser?.username || targetUser?.full_name || 'Kullanıcı';
        await base44.asServiceRole.entities.RoomLevel.create({
          owner_id: room.owner_id, user_id: tid, user_name: targetName, level: clampedLevel, message_count: 0
        });
      }
      return Response.json({ ok: true });
    }

    // leave
    if (ghost) return Response.json({ ok: true });
    await updatePresenceRoom(base44, user.id, '');
    let participants = (room.participants || []).filter((p) => p.user_id !== user.id);
    // Oda sahibi çıkıyor ve katılımcı varsa: online kontrolü atla, sahipliği devret
    const isOwnerLeavingWithParticipants = isOwner && participants.length > 0 && !room.is_personal;
    // Çevrim içi katılımcı yoksa odayı kapat (sadece sahipsiz çıkışlarda)
    if (!isOwnerLeavingWithParticipants && participants.length > 0 && !room.is_personal) {
      let hasOnline = false;
      for (const p of participants) {
        const presence = await base44.asServiceRole.entities.UserPresence.filter({ user_id: p.user_id }, '-created_date', 1).catch(() => []);
        const rec = presence[0];
        if (rec && rec.online && rec.last_seen && Date.now() - new Date(rec.last_seen).getTime() < 30000) {
          hasOnline = true;
          break;
        }
      }
      if (!hasOnline) participants = [];
    }
    if (participants.length === 0) {
      if (room.is_personal) {
        await base44.asServiceRole.entities.Room.update(room_id, { participants, is_playing: false });
      } else {
        await base44.asServiceRole.entities.Room.update(room_id, { participants, status: 'closed', is_playing: false });
      }
      const roleInfoLeave = getRoleInfo(me, labelOverrides);
      const roleMetaLeave = roleInfoLeave.label ? `{{ROLE|${roleInfoLeave.key || ''}|${roleInfoLeave.color || ''}|${roleInfoLeave.animation || 'pulse'}}}` : '';
      const frameInfoLeave = await getSpecialFrameInfo(base44, me, false);
      const frameMetaLeave = frameInfoLeave ? `{{FRAME|${frameInfoLeave.id}|${frameInfoLeave.theme_color}|${frameInfoLeave.text_color}|${frameInfoLeave.glow_color}|${frameInfoLeave.title}}}` : '';
      const titlePrefixLeave = frameInfoLeave?.title
        ? `${frameInfoLeave.title} `
        : (roleInfoLeave.label && roleInfoLeave.show_in_room ? `${roleInfoLeave.icon} ${roleInfoLeave.label} ` : '');
      const leaveName = frameInfoLeave ? `${name} ` : (roleInfoLeave.hide_username_entry ? '' : `${name} `);
      await base44.asServiceRole.entities.RoomMessage.create({
        room_id, user_id: user.id, user_name: name, user_avatar: user.avatar || '',
        text: `${frameMetaLeave}${roleMetaLeave}${titlePrefixLeave}${leaveName}odadan ayrıldı.`, type: 'system'
      });
      return Response.json({ ok: true });
    }
    let owner_id = room.owner_id;
    let owner_name = room.owner_name;
    const ownershipTransferred = isOwner && participants.length > 0 && !room.is_personal;
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
    const roleInfoLeave2 = getRoleInfo(me, labelOverrides);
    const roleMetaLeave2 = roleInfoLeave2.label ? `{{ROLE|${roleInfoLeave2.key || ''}|${roleInfoLeave2.color || ''}|${roleInfoLeave2.animation || 'pulse'}}}` : '';
    const frameInfoLeave2 = await getSpecialFrameInfo(base44, me, false);
    const frameMetaLeave2 = frameInfoLeave2 ? `{{FRAME|${frameInfoLeave2.id}|${frameInfoLeave2.theme_color}|${frameInfoLeave2.text_color}|${frameInfoLeave2.glow_color}|${frameInfoLeave2.title}}}` : '';
    const titlePrefixLeave2 = frameInfoLeave2?.title
      ? `${frameInfoLeave2.title} `
      : (roleInfoLeave2.label && roleInfoLeave2.show_in_room ? `${roleInfoLeave2.icon} ${roleInfoLeave2.label} ` : '');
    const leaveName2 = frameInfoLeave2 ? `${name} ` : (roleInfoLeave2.hide_username_entry ? '' : `${name} `);
    await base44.asServiceRole.entities.RoomMessage.create({
      room_id, user_id: user.id, user_name: name, user_avatar: user.avatar || '',
      text: `${frameMetaLeave2}${roleMetaLeave2}${titlePrefixLeave2}${leaveName2}odadan ayrıldı.`, type: 'system'
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