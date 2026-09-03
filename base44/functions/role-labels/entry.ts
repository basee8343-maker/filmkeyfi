import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isSiteOwner, ROLE_DEFINITIONS } from '../../shared/roles.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body || {};

    // GET: return all custom role labels (public — any authenticated user can read)
    if (action === 'get') {
      const records = await base44.asServiceRole.entities.AppConfig.filter({ key: 'role_labels' }, '-created_date', 1).catch(() => []);
      let labels = {};
      if (records[0]?.value) {
        try { labels = JSON.parse(records[0].value); } catch {}
      }
      return Response.json({ labels });
    }

    // SAVE: update a single role label (admin only)
    if (action === 'save') {
      const me = await base44.auth.me();
      if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (!isSiteOwner(me)) return Response.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });

      const { role_key, label } = body;
      if (!role_key || !ROLE_DEFINITIONS[role_key]) {
        return Response.json({ error: 'geçersiz rol' }, { status: 400 });
      }
      const cleanLabel = (label || '').trim().slice(0, 40);

      // Fetch existing labels
      const records = await base44.asServiceRole.entities.AppConfig.filter({ key: 'role_labels' }, '-created_date', 1).catch(() => []);
      let labels = {};
      if (records[0]?.value) {
        try { labels = JSON.parse(records[0].value); } catch {}
      }

      // Update or remove the label
      if (cleanLabel) {
        labels[role_key] = cleanLabel;
      } else {
        delete labels[role_key];
      }

      const valueStr = JSON.stringify(labels);
      if (records[0]?.id) {
        await base44.asServiceRole.entities.AppConfig.update(records[0].id, { value: valueStr });
      } else {
        await base44.asServiceRole.entities.AppConfig.create({ key: 'role_labels', value: valueStr });
      }

      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: me.id,
        admin_name: me.username || me.full_name,
        action: 'Rol ismi değiştirildi',
        target: role_key,
        details: cleanLabel || '(sıfırlandı)'
      }).catch(() => {});

      return Response.json({ ok: true, labels });
    }

    return Response.json({ error: 'geçersiz işlem' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message || 'sunucu hatası' }, { status: 500 });
  }
}