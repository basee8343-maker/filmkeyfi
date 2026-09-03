import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getClientIp } from '../../shared/sessionInfo.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.session_id || user.active_session_id || '');
    if (!sessionId) return Response.json({ ok: false });

    const ip = getClientIp(req);
    const update = { last_active: new Date().toISOString(), last_ip: ip };
    if (typeof body?.gps_lat === 'number' && typeof body?.gps_lng === 'number') {
      update.gps_lat = body.gps_lat;
      update.gps_lng = body.gps_lng;
      update.gps_accuracy = (typeof body?.gps_accuracy === 'number' ? body.gps_accuracy : null);
      update.gps_at = new Date().toISOString();
    }

    await base44.asServiceRole.entities.UserSession.updateMany(
      { session_id: sessionId, user_id: user.id, status: 'active' },
      { $set: update }
    ).catch(() => {});
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'işlem başarısız' }, { status: 500 });
  }
}