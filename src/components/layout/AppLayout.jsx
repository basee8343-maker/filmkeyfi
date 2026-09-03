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
import RoleCelebrationOverlay from '@/components/role/RoleCelebrationOverlay';

// Abonelik gerektirmeyen sayfalar
const EXEMPT_PATHS = ['/abonelik', '/destek', '/bildirimler', '/odeme', '/güvenlik-protokolü', '/bakim'];

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useCurrentUser();
  useFriendPresence(user, true);
  useRoleCelebration();
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

  // Ban kontrolü — engellenmiş kullanıcıları ban ekranına yönlendir
  useEffect(() => {
    if (user?.is_banned && pathname !== '/engellendiniz') {
      window.location.href = '/engellendiniz';
    }
  }, [user?.is_banned, pathname]);

  // Gerçek zamanlı askıya alma tespiti
  useEffect(() => {
    if (!user) return;
    const unsubNotif = base44.entities.Notification.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.user_id === user.id && ev.data?.type === 'suspended') {
        window.location.href = '/engellendiniz';
      }
    });
    const unsubUser = base44.entities.User.subscribe((ev) => {
      if (ev.type === 'update' && ev.data?.id === user.id && ev.data?.is_banned) {
        window.location.href = '/engellendiniz';
      }
    });
    return () => { unsubNotif(); unsubUser(); };
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