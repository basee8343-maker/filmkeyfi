import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { safeErrorResponse, logSecurity } from '../../shared/security.ts';
import { isSiteOwner, FRAME_DEFINITIONS, ROLE_DEFINITIONS } from '../../shared/roles.ts';
import { upsertNotification } from '../../shared/upsertNotification.ts';
import { setRoomLevel, validRoomLevel } from '../../shared/roomLevels.ts';

async function removeFromAllRooms(base44, userId, userName) {
  const rooms = await base44.asServiceRole.entities.Room.filter({ status: 'active' }, '-created_date', 200).catch(() => []);
  for (const room of rooms) {
    const participants = room.participants || [];
    if (!participants.some((p) => p.user_id === userId)) continue;
    const newParticipants = participants.filter((p) => p.user_id !== userId);
    let update: any = { participants: newParticipants };
    if (room.owner_id === userId) {
      if (newParticipants.length > 0) {
        update.owner_id = newParticipants[0].user_id;
        update.owner_name = newParticipants[0].name;
      } else {
        update.status = 'closed';
        update.is_playing = false;
      }
    }
    await base44.asServiceRole.entities.Room.update(room.id, update).catch(() => {});
    await base44.asServiceRole.entities.RoomMessage.create({
      room_id: room.id, user_id: userId, user_name: userName,
      text: `${userName} engellendi ve odadan kaldırıldı.`, type: 'system'
    }).catch(() => {});
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, user_id } = body || {};
    if (!user_id || !action) return Response.json({ error: 'eksik bilgi' }, { status: 400 });
    if (!isSiteOwner(me) && !(me.role === 'admin' && action === 'set_room_level')) return Response.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });

    const target = await base44.asServiceRole.entities.User.get(user_id);
    if (!target) return Response.json({ error: 'kullanıcı bulunamadı' }, { status: 404 });
    if (isSiteOwner(target) && me.id !== user_id) {
      return Response.json({ error: 'Site sahibi üzerinde bu işlem yapılamaz' }, { status: 403 });
    }

    const adminName = me.username || me.full_name;

    if (action === 'set_room_level') {
      const level = Number(body.level);
      if (!validRoomLevel(level)) return Response.json({ error: 'LVL 1–1000 arasında tam sayı olmalıdır.' }, { status: 400 });
      const saved = await setRoomLevel(base44, target, level);
      const appliedLevel = saved.level;
      await base44.asServiceRole.entities.AdminLog.create({ admin_id: me.id, admin_name: adminName, action: 'Ortak LVL güncellendi', target: target.email || user_id, details: `LVL ${appliedLevel}` }).catch(() => {});
      await upsertNotification(base44, { user_id, title: 'LVL seviyeniz güncellendi', body: `Yeni seviyeniz: LVL ${appliedLevel}`, type: 'info' });
      return Response.json({ ok: true, level: appliedLevel });
    }

    if (action === 'assign_role') {
      const { role_key } = body;
      if (role_key && !ROLE_DEFINITIONS[role_key]) return Response.json({ error: 'geçersiz rol' }, { status: 400 });
      await base44.asServiceRole.entities.User.update(user_id, {
        display_role: role_key || '',
        custom_role: null,
      });
      const roleDef = ROLE_DEFINITIONS[role_key || ''];
      if (['founder', 'queen_admin', 'admin_helper'].includes(role_key)) await setRoomLevel(base44, { ...target, display_role: role_key }, 1000);
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: adminName,
        action: 'Rol atandı', target: target.email || user_id,
        details: roleDef?.label || 'rol kaldırıldı'
      }).catch(() => {});
      if (roleDef?.label) {
        await upsertNotification(base44, {
          user_id, title: `${roleDef.icon} Yeni Rolünüz: ${roleDef.label}`,
          body: 'Rolünüz profilinizde ve odalarda görünüyor.',
          type: 'role'
        });
      }
      return Response.json({ ok: true });
    }

    if (action === 'remove_role') {
      await base44.asServiceRole.entities.User.update(user_id, { display_role: '', custom_role: null });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: adminName,
        action: 'Rol kaldırıldı', target: target.email || user_id
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'assign_frame') {
      const { frame } = body;
      if (!FRAME_DEFINITIONS[frame] && frame !== '') return Response.json({ error: 'geçersiz çerçeve' }, { status: 400 });
      const unlocked = frame ? [...new Set([...(target.unlocked_profile_frames || []), frame])] : (target.unlocked_profile_frames || []);
      await base44.asServiceRole.entities.User.update(user_id, { profile_frame: frame, unlocked_profile_frames: unlocked });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: adminName,
        action: 'Çerçeve atandı', target: target.email || user_id,
        details: frame || 'çerçeve kaldırıldı'
      }).catch(() => {});
      if (frame) {
        const fi = FRAME_DEFINITIONS[frame];
        if (fi) {
          await upsertNotification(base44, {
            user_id, title: `🖼️ Yeni Çerçeveniz: ${fi.label}`,
            body: 'Profil çerçeveniz güncellendi.',
            type: 'role'
          });
        }
      }
      return Response.json({ ok: true });
    }

    if (action === 'set_frame_display') {
      const scale = Number(body.scale);
      if (!Number.isInteger(scale) || scale < 70 || scale > 130) return Response.json({ error: 'Boyut 70–130 arasında olmalıdır.' }, { status: 400 });
      const entranceEnabled = !!body.entrance_enabled;
      await base44.asServiceRole.entities.User.update(user_id, { profile_frame_scale: scale, profile_frame_entrance_enabled: entranceEnabled });
      await base44.asServiceRole.entities.AdminLog.create({ admin_id: me.id, admin_name: adminName, action: 'Çerçeve görünümü güncellendi', target: target.email || user_id, details: `%${scale} · giriş ${entranceEnabled ? 'açık' : 'kapalı'}` }).catch(() => {});
      return Response.json({ ok: true, scale, entrance_enabled: entranceEnabled });
    }

    if (action === 'ban_user') {
      const { reason, description } = body;
      const targetName = target.username || target.full_name || 'Kullanıcı';
      await base44.asServiceRole.entities.User.update(user_id, {
        is_banned: true,
        ban_reason: (reason || '').slice(0, 100),
        ban_description: (description || '').slice(0, 500),
        banned_at: new Date().toISOString(),
        banned_by: me.id,
        membership_status: 'blocked',
        active_session_id: '',
      });
      await base44.asServiceRole.entities.UserSession.updateMany(
        { user_id, status: 'active' },
        { $set: { status: 'inactive', ended_at: new Date().toISOString() } }
      ).catch(() => {});
      await removeFromAllRooms(base44, user_id, targetName);
      await upsertNotification(base44, {
        user_id, title: '🚫 Hesabınız engellendi',
        body: `Engel nedeni: ${reason || 'Belirtilmedi'}`,
        type: 'suspended'
      });
      await logSecurity(base44, 'user_banned', target, `${reason || ''} | ${description || ''}`, 'warning');
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: adminName,
        action: 'Kullanıcı engellendi', target: target.email || user_id,
        details: `${reason || ''}${description ? ' | ' + description : ''}`
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'unban_user') {
      await base44.asServiceRole.entities.User.update(user_id, {
        is_banned: false,
        ban_reason: '',
        ban_description: '',
        banned_at: '',
        banned_by: '',
        membership_status: 'active',
      });
      await upsertNotification(base44, {
        user_id, title: '✅ Engel kaldırıldı',
        body: 'Hesabınız tekrar aktif edildi.',
        type: 'info'
      });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: adminName,
        action: 'Engel kaldırıldı', target: target.email || user_id
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'create_custom_role') {
      const { name, icon, color, neon, animation, show_in_room, moderator } = body;
      if (!name || !name.trim()) return Response.json({ error: 'rol adı gerekli' }, { status: 400 });
      const custom_role = {
        name: name.trim().slice(0, 40),
        icon: (icon || '✨').slice(0, 4),
        color: (color || '#8b5cf6').slice(0, 7),
        neon: !!neon,
        animation: (animation || 'pulse').slice(0, 30),
        show_in_room: !!show_in_room,
        moderator: !!moderator,
      };
      await base44.asServiceRole.entities.User.update(user_id, { display_role: '', custom_role });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: adminName,
        action: 'Özel rol atandı', target: target.email || user_id,
        details: custom_role.name
      }).catch(() => {});
      await upsertNotification(base44, {
        user_id, title: `${custom_role.icon} Yeni Özel Rolünüz: ${custom_role.name}`,
        body: 'Tebrikler! Özel rolünüz profilinizde ve odalarda görünüyor.',
        type: 'role'
      });
      return Response.json({ ok: true });
    }

    if (action === 'assign_special_frame') {
      const { frame_id, entry_enabled, exit_enabled } = body;
      let resolvedTitle = '';
      if (frame_id) {
        const frame = await base44.asServiceRole.entities.SpecialFrame.get(frame_id).catch(() => null);
        if (!frame) return Response.json({ error: 'çerçeve bulunamadı' }, { status: 400 });
        resolvedTitle = frame.title || frame.name || '';
      }
      const updates: any = {
        special_frame_id: frame_id || '',
        special_frame_title: resolvedTitle.slice(0, 60),
        special_frame_entry: entry_enabled !== false,
        special_frame_exit: exit_enabled !== false,
      };
      await base44.asServiceRole.entities.User.update(user_id, updates);
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: adminName,
        action: 'Özel çerçeve atandı', target: target.email || user_id,
        details: frame_id ? `Çerçeve: ${frame_id}` : 'çerçeve kaldırıldı'
      }).catch(() => {});
      if (frame_id) {
        await upsertNotification(base44, {
          user_id, title: '🖼️ Özel Çerçeveniz Atandı',
          body: 'Oda girişlerinizde özel çerçeveniz görünecek.',
          type: 'role'
        });
      }
      return Response.json({ ok: true });
    }

    if (action === 'set_name_effect') {
      const { effect } = body;
      const valid = ['', 'flame', 'lightning', 'heart', 'diamond', 'star', 'gold', 'smoke', 'solid'];
      if (!valid.includes(effect)) return Response.json({ error: 'geçersiz efekt' }, { status: 400 });
      await base44.asServiceRole.entities.User.update(user_id, { name_effect: effect });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: adminName,
        action: 'İsim animasyonu ayarlandı', target: target.email || user_id,
        details: effect || 'varsayılan'
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'set_msg_effect') {
      const { effect } = body;
      const valid = ['', 'flame', 'lightning', 'heart', 'diamond', 'star', 'gold', 'smoke', 'solid'];
      if (!valid.includes(effect)) return Response.json({ error: 'geçersiz efekt' }, { status: 400 });
      await base44.asServiceRole.entities.User.update(user_id, { msg_effect: effect });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: adminName,
        action: 'Mesaj çerçevesi ayarlandı', target: target.email || user_id,
        details: effect || 'varsayılan'
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'geçersiz işlem' }, { status: 400 });
  } catch (e) {
    return safeErrorResponse(e);
  }
}