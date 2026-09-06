import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sanitizeText, validateUrl, rateLimit } from '../../shared/security.ts';
import { resolveProfileFrame } from '../../shared/profileFrames.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    let { username, phone, avatar, profile_frame, profile_frame_scale, profile_avatar_x, profile_avatar_y, profile_frame_entrance_enabled } = body || {};

    // Rate limit: 10 güncelleme / dakika
    const rl = await rateLimit(base44, 'profile:' + user.id, user.id, 10, 60000);
    if (!rl.allowed) return Response.json({ error: 'çok hızlı güncelleme' }, { status: 429 });

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
      // Sadece çerçeve değişimi gerektiğinde kullanıcı kaydını çek
      const me = await base44.asServiceRole.entities.User.get(user.id).catch(() => null);
      const unlocked = (me && me.unlocked_profile_frames) || [];
      const frameDef = await resolveProfileFrame(base44, frame);
      if (frame && (!frameDef || !unlocked.includes(frame))) return Response.json({ error: 'Bu çerçeve hesabınızda açık değil.' }, { status: 403 });
      updates.profile_frame = frame;
    }
    if (profile_frame_scale !== undefined) {
      const s = Number(profile_frame_scale);
      if (Number.isInteger(s) && s >= 80 && s <= 180) updates.profile_frame_scale = s;
    }
    if (profile_avatar_x !== undefined) {
      const x = Number(profile_avatar_x);
      if (Number.isInteger(x) && x >= -100 && x <= 100) updates.profile_avatar_x = x;
    }
    if (profile_avatar_y !== undefined) {
      const y = Number(profile_avatar_y);
      if (Number.isInteger(y) && y >= -100 && y <= 100) updates.profile_avatar_y = y;
    }
    if (profile_frame_entrance_enabled !== undefined) {
      updates.profile_frame_entrance_enabled = !!profile_frame_entrance_enabled;
    }
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.User.update(user.id, updates);
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[update-profile error]', e?.message || String(e), e?.stack || '');
    return Response.json({ error: e?.message || 'Profil güncellenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}