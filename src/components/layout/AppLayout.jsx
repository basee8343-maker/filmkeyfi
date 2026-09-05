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
import { useToast } from '@/components/ui/use-toast';

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
  const { toast } = useToast();
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

  // Tek noktadan anlık durum kontrolü — 3sn'de bir tek me() çağrısıyla:
  // ban/askıya alma/silme + abonelik onayı + cihaz/session + bakım modu
  const wasInactiveRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    let tick = 0;
    const check = async () => {
      try {
        const u = await base44.auth.me();
        // Ban / askıya alma / silme
        if (u?.is_banned || u?.role === 'banned' || u?.is_suspended || u?.membership_status === 'suspended') {
          triggerBanNotice('banned');
          base44.auth.logout().catch(() => {});
          window.location.href = '/login?banned=1';
          return;
        }
        // Abonelik onayı — pending kullanıcı aktif olunca ana sayfaya
        const isActive = membershipActive(u);
        if (!isActive) {
          wasInactiveRef.current = true;
        } else if (wasInactiveRef.current) {
          wasInactiveRef.current = false;
          window.location.href = '/';
          return;
        }
        // Cihaz/session kontrolü (adminler hariç — çoklu cihaz girişine izin)
        if (u?.role !== 'admin') {
          const stored = localStorage.getItem('filmkeyfi_session_' + u.id);
          if (stored && u?.active_session_id && stored !== u.active_session_id) {
            triggerBanNotice('kicked');
            base44.auth.logout().catch(() => {});
            localStorage.removeItem('filmkeyfi_session_' + u.id);
            window.location.href = '/login?kicked=1';
            return;
          }
        }
        // Bakım modu — 6sn'de bir kontrol (her 2. tick)
        tick++;
        if (tick % 2 === 0 && u?.role !== 'admin') {
          const ps = await base44.functions.invoke('public-settings', {}).catch(() => null);
          const s = ps?.data || ps;
          if (s?.maintenance_mode) {
            window.location.href = '/bakim';
            return;
          }
        }
      } catch (e) {
        if (e?.status === 401 || e?.status === 403 || e?.status === 404) {
          triggerBanNotice('removed');
          base44.auth.logout().catch(() => {});
          window.location.href = '/login?removed=1';
        }
      }
    };
    check();
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, [user?.id]);

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
      if (ev.type !== 'create' || ev.data?.user_id !== user.id) return;
      if (ev.data?.type === 'suspended') {
        triggerBanNotice('banned');
        base44.auth.logout().catch(() => {});
        window.location.href = '/login?banned=1';
        return;
      }
      // Özel mesajlar üst bildirim yerine yalnızca sohbet rozetinde gösterilir.
      if (ev.data?.type === 'dm') return;
      toast({ title: ev.data?.title || 'Bildirim', description: ev.data?.body });
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

  // Sayfa görünür olunca anlık güvenlik kontrolü — kullanıcı geri döndüğünde ban/askıya alma/silme tespiti
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible' || !user) return;
      try {
        const u = await base44.auth.me();
        if (u?.is_banned || u?.role === 'banned' || u?.is_suspended || u?.membership_status === 'suspended') {
          triggerBanNotice('banned');
          base44.auth.logout().catch(() => {});
          window.location.href = '/login?banned=1';
        }
      } catch (e) {
        if (e?.status === 401 || e?.status === 403 || e?.status === 404) {
          triggerBanNotice('removed');
          base44.auth.logout().catch(() => {});
          window.location.href = '/login?removed=1';
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
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