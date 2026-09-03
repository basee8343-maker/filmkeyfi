import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { rateLimit, safeErrorResponse } from '../../shared/security.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { user_id } = body || {};
    if (!user_id) return Response.json({ error: 'user_id gerekli' }, { status: 400 });
    // Rate limit: 60 istek / dakika
    const rl = await rateLimit(base44, 'user-profile:' + user.id, user.id, 60, 60000);
    if (!rl.allowed) return Response.json({ error: 'çok fazla istek' }, { status: 429 });
    const u = await base44.asServiceRole.entities.User.get(user_id);
    if (!u) return Response.json({ error: 'kullanıcı bulunamadı' }, { status: 404 });
    return Response.json({
      username: u.username || '',
      full_name: u.full_name || '',
      avatar: u.avatar || '',
      member_id: u.member_id || '-',
      role: u.role || '',
      display_role: u.display_role || '',
      custom_role: u.custom_role || null,
      profile_frame: u.profile_frame || '',
      title: u.title || '',
      created_date: u.created_date || null
    });
  } catch (e) {
    return safeErrorResponse(e);
  }
}