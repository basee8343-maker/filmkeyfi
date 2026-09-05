import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getXpSettings, getUserXp, ensureUserXp } from '../../shared/xp.ts';

const num = (value, fallback = 0) => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'bootstrap';

    if (action === 'bootstrap') {
      const [settings, frames] = await Promise.all([
        getXpSettings(base44),
        base44.asServiceRole.entities.XpFrame.list('min_xp', 100),
      ]);
      return Response.json({ settings, frames });
    }

    const me = await base44.asServiceRole.entities.User.get(user.id);
    if (me.role !== 'admin') return Response.json({ error: 'yetkisiz' }, { status: 403 });

    if (action === 'set_xp' || action === 'add_xp') {
      if (!body.user_id) return Response.json({ error: 'kullanıcı gerekli' }, { status: 400 });
      const target = await base44.asServiceRole.entities.User.get(body.user_id);
      const row = await ensureUserXp(base44, target.id, target.username || target.full_name);
      const current = Math.max(0, num(row.xp));
      const next = action === 'set_xp' ? Math.max(0, num(body.xp)) : Math.max(0, current + num(body.amount));
      const updated = await base44.asServiceRole.entities.UserXp.update(row.id, { xp: next });
      return Response.json({ user_xp: updated });
    }

    if (action === 'set_manual_frame') {
      const target = await base44.asServiceRole.entities.User.get(body.user_id);
      const row = await ensureUserXp(base44, target.id, target.username || target.full_name);
      const updated = await base44.asServiceRole.entities.UserXp.update(row.id, { manual_frame_id: body.frame_id || '' });
      return Response.json({ user_xp: updated });
    }

    if (action === 'save_settings') {
      const settings = await getXpSettings(base44);
      const updated = await base44.asServiceRole.entities.XpSettings.update(settings.id, {
        xp_per_message: Math.max(0, num(body.xp_per_message, 10)),
        enabled: body.enabled !== false,
      });
      return Response.json({ settings: updated });
    }

    if (action === 'save_frame') {
      const data = {
        name: String(body.name || '').slice(0, 60) || 'Çerçeve',
        min_xp: Math.max(0, num(body.min_xp)),
        style: body.style || 'starter',
        image_url: body.image_url || '',
        active: body.active !== false,
        animated: body.animated !== false,
        sort_order: num(body.sort_order),
      };
      const frame = body.frame_id
        ? await base44.asServiceRole.entities.XpFrame.update(body.frame_id, data)
        : await base44.asServiceRole.entities.XpFrame.create(data);
      return Response.json({ frame });
    }

    if (action === 'delete_frame') {
      await base44.asServiceRole.entities.XpFrame.delete(body.frame_id);
      return Response.json({ ok: true });
    }

    if (action === 'get_user') {
      const row = await getUserXp(base44, body.user_id);
      return Response.json({ user_xp: row });
    }

    return Response.json({ error: 'bilinmeyen işlem' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'işlem başarısız' }, { status: 500 });
  }
}