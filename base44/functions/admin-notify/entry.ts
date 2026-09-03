import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { rateLimit, safeErrorResponse } from '../../shared/security.ts';
import { notifyAdmins } from '../../shared/adminNotify.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { event, ref_id, title, body: msgBody, link, telegram_data } = body || {};

    if (!event || !title) return Response.json({ error: 'eksik bilgi' }, { status: 400 });

    // Rate limit: 20 bildirim / dakika / kullanıcı
    const rl = await rateLimit(base44, 'admin-notify:' + user.id, user.id, 20, 60000);
    if (!rl.allowed) return Response.json({ error: 'rate limited' }, { status: 429 });

    const result = await notifyAdmins(base44, {
      event,
      ref_id,
      title,
      body: msgBody,
      link,
      telegram_data,
    });

    return Response.json(result);
  } catch (e) {
    return safeErrorResponse(e);
  }
}