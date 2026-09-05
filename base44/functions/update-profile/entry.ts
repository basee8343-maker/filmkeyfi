import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sanitizeText, validateUrl, rateLimit, safeErrorResponse } from '../../shared/security.ts';
import { FRAME_DEFINITIONS } from '../../shared/roles.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    let { username, phone, avatar, full_name, profile_frame, profile_frame_scale } = body || {};

    // Rate limit: 10 güncelleme / dakika
    const rl = await rateLimit(base44, 'profile:' + user.id, user.id, 10, 60000);
    if (!rl.allowed) return Response.json({ error: 'çok hızlı güncelleme' }, { status: 429 });

    const me = await base44.asServiceRole.entities.User.get(user.id);

    const updates = {};
    if (username !== undefined) {
      const u = sanitizeText(username, 40);
      if (u) updates.username = u;
    }
    if (phone !== undefined) {
      const p = sanitizeText(phone, 20).replace(/[^\d+\-\s()]/g, '');
      if (p) updates.phone = p;
    }
    if (avatar !== undefined) {
      if (avatar === '') {
        updates.avatar = '';
      } else {
        const a = validateUrl(avatar);
        if (a) updates.avatar = a;
      }
    }
    if (profile_frame !== undefined) {
      const frame = String(profile_frame || '');
      const unlocked = me.unlocked_profile_frames || [];
      if (frame && (!FRAME_DEFINITIONS[frame] || !unlocked.includes(frame))) return Response.json({ error: 'Bu çerçeve hesabınızda açık değil.' }, { status: 403 });
      updates.profile_frame = frame;
    }
    if (profile_frame_scale !== undefined) {
      const s = Number(profile_frame_scale);
      if (Number.isInteger(s) && s >= 80 && s <= 180) updates.profile_frame_scale = s;
    }
    // Moderator'ün full_name'i kilitli — backend seviyesinde değiştirilemez
    if (full_name !== undefined && me.role !== 'moderator') {
      const fn = sanitizeText(full_name, 60);
      if (fn) updates.full_name = fn;
    }

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.User.update(user.id, updates);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return safeErrorResponse(e);
  }
}