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

    if (['set_manual_frame', 'save_frame', 'delete_frame'].includes(action)) {
      return Response.json({ error: 'XP çerçeveleri kaldırıldı. Kullanıcılar bölümündeki profil çerçevelerini kullanın.' }, { status: 410 });
    }

    if (action === 'save_settings') {
      const settings = await getXpSettings(base44);
      const updated = await base44.asServiceRole.entities.XpSettings.update(settings.id, {
        xp_per_message: Math.max(0, num(body.xp_per_message, 10)),
        enabled: body.enabled !== false,
      });
      return Response.json({ settings: updated });
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