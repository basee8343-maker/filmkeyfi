import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { useAuth } from '@/lib/AuthContext';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import MaintenanceMode from '@/pages/MaintenanceMode';
import useFriendPresence from '@/hooks/useFriendPresence';
import useRoleCelebration from '@/hooks/useRoleCelebration';
import useRoleLabels from '@/hooks/useRoleLabels';
import RoleCelebrationOverlay from '@/components/role/RoleCelebrationOverlay';
import { detectConnectionType } from '@/lib/connectionType';
import { triggerBanNotice } from '@/lib/banNotice';

// Abonelik gerektirmeyen sayfalar
const EXEMPT_PATHS = ['/abonelik', '/destek', '/bildirimler', '/odeme', '/güvenlik-protokolü', '/bakim'];

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useCurrentUser();
  useFriendPresence(user, true);
  useRoleCelebration();
  useRoleLabels();
  const { publicSettings } = useAuth();
  // RoleCelebrationOverlay renders a full-screen animated character when role changes
  const isRoom = pathname.startsWith('/oda/');

  // Bakım modu: admin olmayan kullanıcılar bakım ekranı görür
  const isAdmin = user?.role === 'admin';
  const isMaintenance = publicSettings?.maintenance_mode && !isAdmin && pathname !== '/bakim';
  useEffect(() => {
    if (isMaintenance) window.location.href = '/bakim';
  }, [isMaintenance]);

  // Abonelik kontrolü: ödemesi olmayan kullanıcılar içerik sayfalarına gidemez
  useEffect(() => {
    if (loading || !user || isRoom) return;
    if (publicSettings?.payment_required === false) return;
    if (membershipActive(user)) return;
    const isExempt = EXEMPT_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith('/admin') || pathname.startsWith('/kullanici');
    if (!isExempt && pathname !== '/abonelik') {
      navigate('/abonelik', { replace: true });
    }
  }, [loading, user, pathname, isRoom]);

  // Ban kontrolü — engellenmiş kullanıcıları giriş ekranına at
  useEffect(() => {
    if (user?.is_banned && pathname !== '/login') {
      triggerBanNotice('banned');
      base44.auth.logout().catch(() => {});
      window.location.href = '/login?banned=1';
    }
  }, [user?.is_banned, pathname]);

  // Gerçek zamanlı askıya alma tespiti
  useEffect(() => {
    if (!user) return;
    const unsubNotif = base44.entities.Notification.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.user_id === user.id && ev.data?.type === 'suspended') {
        triggerBanNotice('banned');
        base44.auth.logout().catch(() => {});
        window.location.href = '/login?banned=1';
      }
    });
    const unsubUser = base44.entities.User.subscribe((ev) => {
      if (ev.type === 'update' && ev.data?.id === user.id && ev.data?.is_banned) {
        triggerBanNotice('banned');
        base44.auth.logout().catch(() => {});
        window.location.href = '/login?banned=1';
      }
      if (ev.type === 'delete' && (ev.data?.id === user.id || ev.id === user.id)) {
        triggerBanNotice('removed');
        base44.auth.logout().catch(() => {});
        window.location.href = '/login?removed=1';
      }
    });
    return () => { unsubNotif(); unsubUser(); };
  }, [user?.id]);

  // Oturum heartbeat — aktif kalma sinyali + opsiyonel GPS
  useEffect(() => {
    if (!user) return;
    const beat = async () => {
      const sessionId = localStorage.getItem('filmkeyfi_session_' + user.id);
      if (!sessionId) return;
      const payload = { session_id: sessionId, connection_type: detectConnectionType() };
      const gpsRaw = localStorage.getItem('filmkeyfi_gps_' + user.id);
      if (gpsRaw) {
        try { const c = JSON.parse(gpsRaw); if (typeof c.lat === 'number' && typeof c.lng === 'number') { payload.gps_lat = c.lat; payload.gps_lng = c.lng; payload.gps_accuracy = c.acc; } } catch {}
      }
      base44.functions.invoke('update-presence', payload).catch(() => {});
    };
    beat();
    const id = setInterval(beat, 45000);
    return () => clearInterval(id);
  }, [user?.id]);

  // Yedek kontrol — realtime kaçırsa diye periyodik ban/silme durumu
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const u = await base44.auth.me();
        if (u?.is_banned) { triggerBanNotice('banned'); base44.auth.logout().catch(() => {}); window.location.href = '/login?banned=1'; return; }
        // Admin hesapları için cihaz/session kontrolü atlanır — çoklu cihaz girişine izin verilir
        if (u?.role === 'admin') return;
        const stored = localStorage.getItem('filmkeyfi_session_' + u.id);
        if (stored && u?.active_session_id && stored !== u.active_session_id) {
          triggerBanNotice('kicked');
          base44.auth.logout().catch(() => {});
          localStorage.removeItem('filmkeyfi_session_' + u.id);
          window.location.href = '/login?kicked=1';
        }
      } catch (e) {
        if (e?.status === 401 || e?.status === 403 || e?.status === 404) {
          triggerBanNotice('removed');
          base44.auth.logout().catch(() => {});
          window.location.href = '/login?removed=1';
        }
      }
    };
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [user?.id]);

  // Sosyal girişle yeni kayıt olan kullanıcı için admin bildirimi (email kaydı zaten Register'da gönderir, dedup ref_id ile engeller)
  useEffect(() => {
    if (!user?.id || user.role === 'admin') return;
    const created = user.created_date ? new Date(user.created_date).getTime() : 0;
    if (created && Date.now() - created < 2 * 60 * 1000) {
      base44.functions.invoke('admin-notify', {
        event: 'new_user',
        ref_id: `new_user:${user.email || user.id}`,
        title: 'Yeni kullanıcı kaydoldu',
        body: user.username || user.full_name || user.email,
        link: '/admin/kullanicilar'
      }).catch(() => {});
    }
  }, [user?.id]);

  if (isRoom) {
    return <div className="min-h-screen bg-background"><RoleCelebrationOverlay /><Outlet /></div>;
  }
  return (
    <div className="min-h-screen bg-background">
      <RoleCelebrationOverlay />
      <Navbar />
      <main className="pt-[calc(4rem+max(env(safe-area-inset-top),1.5rem))] pb-20 lg:pt-16 lg:pb-8 max-w-[1600px] mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}