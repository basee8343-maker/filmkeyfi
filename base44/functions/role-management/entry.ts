import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { safeErrorResponse } from '../../shared/security.ts';
import { isSiteOwner, ROLE_DEFINITIONS, FRAME_DEFINITIONS } from '../../shared/roles.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only site owner (role='admin') can manage roles and frames
    if (!isSiteOwner(me)) return Response.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });

    const body = await req.json();
    const { action, user_id } = body || {};
    if (!user_id || !action) return Response.json({ error: 'eksik bilgi' }, { status: 400 });

    // Cannot modify site owner accounts
    const target = await base44.asServiceRole.entities.User.get(user_id);
    if (!target) return Response.json({ error: 'kullanıcı bulunamadı' }, { status: 404 });
    if (isSiteOwner(target) && me.id !== user_id) {
      return Response.json({ error: 'Site sahibi üzerinde bu işlem yapılamaz' }, { status: 403 });
    }

    if (action === 'assign_role') {
      const { role } = body;
      if (!ROLE_DEFINITIONS[role] && role !== '') return Response.json({ error: 'geçersiz rol' }, { status: 400 });
      await base44.asServiceRole.entities.User.update(user_id, { display_role: role, custom_role: null });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: me.username || me.full_name,
        action: 'Rol atandı', target: target.email || user_id,
        details: role || 'rol kaldırıldı'
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'remove_role') {
      await base44.asServiceRole.entities.User.update(user_id, { display_role: '', custom_role: null });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: me.username || me.full_name,
        action: 'Rol kaldırıldı', target: target.email || user_id
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'assign_frame') {
      const { frame } = body;
      if (!FRAME_DEFINITIONS[frame] && frame !== '') return Response.json({ error: 'geçersiz çerçeve' }, { status: 400 });
      await base44.asServiceRole.entities.User.update(user_id, { profile_frame: frame });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: me.username || me.full_name,
        action: 'Çerçeve atandı', target: target.email || user_id,
        details: frame || 'çerçeve kaldırıldı'
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'remove_frame') {
      await base44.asServiceRole.entities.User.update(user_id, { profile_frame: '' });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: me.username || me.full_name,
        action: 'Çerçeve kaldırıldı', target: target.email || user_id
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    if (action === 'create_custom_role') {
      const { name, icon, color, neon } = body;
      if (!name || !name.trim()) return Response.json({ error: 'rol adı gerekli' }, { status: 400 });
      const custom_role = {
        name: name.trim().slice(0, 40),
        icon: (icon || '✨').slice(0, 4),
        color: (color || '#8b5cf6').slice(0, 7),
        neon: !!neon,
      };
      await base44.asServiceRole.entities.User.update(user_id, { display_role: '', custom_role });
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id, admin_name: me.username || me.full_name,
        action: 'Özel rol atandı', target: target.email || user_id,
        details: custom_role.name
      }).catch(() => {});
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'geçersiz işlem' }, { status: 400 });
  } catch (e) {
    return safeErrorResponse(e);
  }
}