import { useEffect, useRef } from 'react';
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
import WhatsNewModal from '@/components/WhatsNewModal';
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
    if (membershipActive(user)) return;
    const paymentAvailable = publicSettings?.payment_available !== false;
    const target = paymentAvailable ? '/abonelik' : '/onay-bekleniyor';
    const exemptPaths = paymentAvailable ? EXEMPT_PATHS : [...EXEMPT_PATHS, '/onay-bekleniyor'];
    const isExempt = exemptPaths.some((p) => pathname.startsWith(p)) || pathname.startsWith('/admin') || pathname.startsWith('/kullanici');
    if (!isExempt && pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [loading, user, pathname, isRoom, publicSettings?.payment_available, publicSettings?.payment_required]);

  // Abonelik onayı tespiti — realtime geçiş + 3sn polling yedeği
  // Admin onayladığında kullanıcıyı ana sayfaya (filmler) yönlendir
  const wasPendingRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    const isActive = membershipActive(user);
    if (isActive) {
      if (wasPendingRef.current && !pathname.startsWith('/admin') && pathname !== '/') {
        wasPendingRef.current = false;
        window.location.href = '/';
      }
      return;
    }
    wasPendingRef.current = true;
    const id = setInterval(async () => {
      try {
        const fresh = await base44.auth.me();
        if (fresh && (fresh.membership_status === 'active' || fresh.role === 'admin' || fresh.role === 'moderator')) {
          window.location.href = '/';
        }
      } catch {}
    }, 3000);
    return () => clearInterval(id);
  }, [user, pathname]);

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
      // Admin üyeliği onayladığında anında ana sayfaya yönlendir
      if (ev.type === 'update' && ev.data?.id === user.id && ev.data?.membership_status === 'active' && !membershipActive(user)) {
        window.location.href = '/';
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

  // Hızlı yedek kontrol — 3sn'de bir ban/askıya alma/silme durumu (realtime kaçırsa diye)
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const u = await base44.auth.me();
        if (u?.is_banned || u?.role === 'banned' || u?.is_suspended || u?.membership_status === 'suspended') {
          triggerBanNotice('banned');
          base44.auth.logout().catch(() => {});
          window.location.href = '/login?banned=1';
          return;
        }
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
    const id = setInterval(check, 3000);
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
      <WhatsNewModal />
      <Navbar />
      <main className="pt-[calc(4rem+max(env(safe-area-inset-top),1.5rem))] pb-20 lg:pt-16 lg:pb-8 max-w-[1600px] mx-auto" style={{ touchAction: 'pan-y' }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}