import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { useAuth } from '@/lib/AuthContext';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import MaintenanceMode from '@/pages/MaintenanceMode';
import useFriendPresence from '@/hooks/useFriendPresence';

// Abonelik gerektirmeyen sayfalar
const EXEMPT_PATHS = ['/abonelik', '/destek', '/bildirimler', '/odeme', '/güvenlik-protokolü', '/bakim'];

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useCurrentUser();
  useFriendPresence(user, true);
  const { publicSettings } = useAuth();
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

  // Gerçek zamanlı askıya alma tespiti
  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.Notification.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.user_id === user.id && ev.data?.type === 'suspended') {
        base44.auth.logout();
        window.location.href = '/login?banned=1';
      }
    });
    return unsub;
  }, [user?.id]);

  if (isRoom) {
    return <div className="min-h-screen bg-background"><Outlet /></div>;
  }
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-[calc(4rem+max(env(safe-area-inset-top),1.5rem))] pb-20 lg:pt-16 lg:pb-8 max-w-[1600px] mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}