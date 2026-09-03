import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const deviceSession = String(body?.device_session || '');
    const sessionId = crypto.randomUUID();
    const prevSession = user.active_session_id || '';
    const userName = user.username || user.full_name || 'Kullanıcı';

    // Önceki aktif oturum varsa ve bu cihazın oturumu değilse — hesap başka cihazdan açılıyor, admin paneline bildir
    if (prevSession && deviceSession !== prevSession) {
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: user.id, admin_name: userName,
        action: 'Hesap başka cihazdan açıldı', target: user.email || user.id,
        details: 'Aynı hesaba yeni bir cihazdan giriş yapıldı; önceki oturum otomatik kapatıldı.'
      }).catch(() => {});
      await base44.asServiceRole.entities.Notification.create({
        user_id: 'admin', title: 'Şüpheli giriş: hesap paylaşımı',
        body: `${userName} hesabına başka bir cihazdan giriş yapıldı. Önceki oturum kapatıldı.`,
        type: 'security', link: '/admin/guvenlik'
      }).catch(() => {});
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      active_session_id: sessionId,
      last_login: new Date().toISOString()
    });
    return Response.json({ session_id: sessionId });
  } catch (e) {
    return Response.json({ error: 'işlem başarısız' }, { status: 500 });
  }
}