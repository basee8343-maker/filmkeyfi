import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { safeErrorResponse } from '../../shared/security.ts';

// Süresi dolan çerçeveleri kullanıcı profillerinden kaldırır.
// Workflow tarafından periyodik olarak çağrılır.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date().toISOString();
    const users = await base44.asServiceRole.entities.User.filter({
      profile_frame: { $ne: '' },
      profile_frame_expires_at: { $lte: now }
    }, '-updated_date', 200).catch(() => []);

    let count = 0;
    for (const user of users) {
      const frame = user.profile_frame || '';
      const unlocked = (user.unlocked_profile_frames || []).filter((f) => f !== frame);
      await base44.asServiceRole.entities.User.update(user.id, {
        profile_frame: '',
        profile_frame_expires_at: null,
        profile_frame_entrance_enabled: false,
        unlocked_profile_frames: unlocked
      }).catch(() => {});
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: 'system', admin_name: 'Otomatik Temizlik',
        action: 'Süresi dolan çerçeve kaldırıldı', target: user.email || user.id,
        details: frame
      }).catch(() => {});
      count++;
    }
    return Response.json({ ok: true, cleaned: count });
  } catch (e) {
    return safeErrorResponse(e);
  }
}