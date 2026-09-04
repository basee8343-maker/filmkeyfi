import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getClientIp, parseUserAgent, geoLookup } from '../../shared/sessionInfo.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const deviceSession = String(body?.device_session || '');
    const connectionType = ['wifi', 'cellular', 'ethernet', 'unknown'].includes(body?.connection_type) ? body.connection_type : 'unknown';
    const sessionId = crypto.randomUUID();
    const prevSession = user.active_session_id || '';
    const userName = user.username || user.full_name || 'Kullanıcı';

    const ip = getClientIp(req);
    const ua = req.headers.get('user-agent') || '';
    const dev = parseUserAgent(ua);
    const geo = await geoLookup(ip);

    // Önceki aktif oturum varsa ve bu cihazın oturumu değilse — hesap başka cihazdan açılıyor, admin paneline bildir
    // Admin hesapları için bu bildirim atlanır (admin birden fazla cihazdan giriş yapabilir)
    const isAdmin = user.role === 'admin';
    if (!isAdmin && prevSession && deviceSession !== prevSession) {
      await base44.asServiceRole.entities.AdminLog.create({
        admin_id: user.id, admin_name: userName,
        action: 'Hesap başka cihazdan açıldı', target: user.email || user.id,
        details: `IP: ${ip || 'bilinmiyor'} · ${dev.deviceType} · ${dev.os} · ${dev.browser}`
      }).catch(() => {});
      await base44.asServiceRole.entities.Notification.create({
        user_id: 'admin', title: 'Şüpheli giriş: hesap paylaşımı',
        body: `${userName} hesabına başka bir cihazdan giriş yapıldı. Önceki oturum kapatıldı.`,
        type: 'security', link: '/admin/oturumlar'
      }).catch(() => {});
    }

    // Admin hesapları için önceki oturumlar pasife çekilmez ve active_session_id güncellenmez
    // — admin birden fazla cihazdan aynı anda giriş yapabilir
    if (!isAdmin) {
      if (prevSession) {
        await base44.asServiceRole.entities.UserSession.updateMany(
          { user_id: user.id, status: 'active' },
          { $set: { status: 'inactive', ended_at: new Date().toISOString() } }
        ).catch(() => {});
      }

      // Yeni oturum kaydı oluştur
      await base44.asServiceRole.entities.UserSession.create({
        user_id: user.id,
        user_name: userName,
        session_id: sessionId,
        ip, last_ip: ip,
        country: geo.country, city: geo.city, region: geo.region, isp: geo.isp,
        device_type: dev.deviceType, os: dev.os, browser: dev.browser,
        model: dev.model || '', connection_type: connectionType,
        first_login: new Date().toISOString(),
        last_active: new Date().toISOString(),
        status: 'active'
      }).catch(() => {});

      await base44.asServiceRole.entities.User.update(user.id, {
        active_session_id: sessionId,
        last_login: new Date().toISOString()
      });
    } else {
      // Admin için sadece yeni oturum kaydı oluştur (öncekileri kapatma)
      await base44.asServiceRole.entities.UserSession.create({
        user_id: user.id,
        user_name: userName,
        session_id: sessionId,
        ip, last_ip: ip,
        country: geo.country, city: geo.city, region: geo.region, isp: geo.isp,
        device_type: dev.deviceType, os: dev.os, browser: dev.browser,
        model: dev.model || '', connection_type: connectionType,
        first_login: new Date().toISOString(),
        last_active: new Date().toISOString(),
        status: 'active'
      }).catch(() => {});

      await base44.asServiceRole.entities.User.update(user.id, {
        last_login: new Date().toISOString()
      });
    }
    return Response.json({ session_id: sessionId });
  } catch (e) {
    return Response.json({ error: 'işlem başarısız' }, { status: 500 });
  }
}