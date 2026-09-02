import { useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { LayoutDashboard, UserCheck, Users, Film, FolderTree, DoorOpen, MessageSquare, LifeBuoy, CreditCard, RefreshCw, Bell, Settings, LogOut, Menu, X, ShieldAlert, KeyRound, Crown, ChevronDown, Package as PackageIcon, Home, Flag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAdminNotifications, requestNotificationPermission } from '@/hooks/useAdminNotifications';
import ThemeToggle from '@/components/ThemeToggle';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/kayit', label: 'Kayıt Kontrol', icon: UserCheck },
  { to: '/admin/kullanicilar', label: 'Kullanıcılar', icon: Users },
  { to: '/admin/filmler', label: 'Filmler', icon: Film },
  { to: '/admin/film-ekle', label: 'Film Yükle', icon: Film },
  { to: '/admin/kategoriler', label: 'Kategoriler', icon: FolderTree },
  { to: '/admin/odalar', label: 'Odalar', icon: DoorOpen },
  { to: '/admin/oda-mesajlari', label: 'Oda Mesajları', icon: MessageSquare },
  { to: '/admin/arkadas-mesajlari', label: 'Arkadaş Mesajları', icon: MessageSquare },
  { to: '/admin/destek', label: 'Destek Mesajları', icon: LifeBuoy },
  { group: 'Ödemeler', items: [
    { to: '/admin/paketler', label: 'Abonelik Ürünleri', icon: PackageIcon },
    { to: '/admin/odemeler', label: 'Ödeme Geçmişi', icon: CreditCard },
    { to: '/admin/abonelikler', label: 'Abonelikler', icon: Crown },
    { to: '/admin/odeme-ayarlari', label: 'Ödeme Ayarları', icon: Settings },
  ]},
  { to: '/admin/bildirimler', label: 'Bildirimler', icon: Bell },
  { to: '/admin/guvenlik', label: 'Güvenlik', icon: ShieldAlert },
  { to: '/admin/sikayetler', label: 'Şikayetler', icon: Flag },
  { to: '/admin/ayarlar', label: 'Ayarlar', icon: Settings },
];

export default function AdminLayout() {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const touchX = useRef(null);
  const [twofaOk, setTwofaOk] = useState(() => sessionStorage.getItem('admin2fa') === 'ok');
  const [twofaCode, setTwofaCode] = useState('');
  const [twofaErr, setTwofaErr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [notifGranted, setNotifGranted] = useState(() => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
  const [payOpen, setPayOpen] = useState(true);
  useAdminNotifications();
  const handleNotif = async () => { const r = await requestNotificationPermission(); setNotifGranted(r === 'granted'); };

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) navigate('/');
  }, [user, loading]);

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user || user.role !== 'admin') return null;

  const verify2fa = async () => {
    setVerifying(true); setTwofaErr('');
    try {
      const res = await base44.functions.invoke('admin-2fa', { action: 'verify', code: twofaCode });
      if (res.data.verified) { sessionStorage.setItem('admin2fa', 'ok'); setTwofaOk(true); }
      else setTwofaErr('Hatalı kod');
    } catch (e) { setTwofaErr(e.response?.data?.error || 'Hatalı kod'); }
    setVerifying(false);
  };

  if (user.twofa_enabled && !twofaOk) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-3"><KeyRound className="w-5 h-5 text-primary" /><h1 className="text-lg font-bold">Admin 2FA Doğrulama</h1></div>
          <p className="text-sm text-muted-foreground mb-4">Admin paneline erişim için authenticator kodunuzu girin.</p>
          <input value={twofaCode} onChange={(e) => setTwofaCode(e.target.value)} maxLength={6} placeholder="6 haneli kod" className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring mb-2" />
          {twofaErr && <p className="text-xs text-destructive mb-2">{twofaErr}</p>}
          <button onClick={verify2fa} disabled={verifying || twofaCode.length !== 6} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">{verifying ? 'Doğrulanıyor...' : 'Doğrula'}</button>
          <button onClick={() => base44.auth.logout('/login')} className="w-full mt-2 text-sm text-muted-foreground py-2">Çıkış</button>
        </div>
      </div>
    );
  }

  const logout = () => { sessionStorage.removeItem('admin2fa'); base44.auth.logout('/login'); };

  const renderItem = (n) => (
    <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
      className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground neon-glow-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
      <n.icon className="w-4 h-4" /> {n.label}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col pt-[max(env(safe-area-inset-top),0rem)] lg:pt-0 transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 flex items-center justify-between">
          <Link to="/admin" className="text-lg font-extrabold"><span className="text-gradient">FILM</span>KEYFİ <span className="text-xs text-muted-foreground font-normal">Admin</span></Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {nav.map((n) => n.group ? (
            <div key={n.group}>
              <button onClick={() => setPayOpen(!payOpen)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-muted-foreground uppercase tracking-wide hover:bg-sidebar-accent">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${payOpen ? '' : '-rotate-90'}`} /> {n.group}
              </button>
              {payOpen && <div className="ml-3 space-y-0.5 mb-1">{n.items.map(renderItem)}</div>}
            </div>
          ) : renderItem(n))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <ThemeToggle className="w-full justify-center" />
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-sidebar-accent"><LogOut className="w-4 h-4" /> Çıkış</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-20 glass border-b border-border min-h-14 flex items-center px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touchX.current ?? 0); if (dx > 55) setOpen(true); else if (dx < -55) setOpen(false); }}>
          <button onClick={() => setOpen(true)}><Menu className="w-6 h-6" /></button>
          <Link to="/" className="ml-2 p-1.5 rounded-lg hover:bg-secondary" title="Ana Sayfa"><Home className="w-5 h-5" /></Link>
          <span className="ml-1 hidden min-[390px]:block font-bold whitespace-nowrap">Admin Panel</span>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            <ThemeToggle />
            <button onClick={handleNotif} className="p-2 rounded-lg hover:bg-secondary relative shrink-0" title="Bildirimleri Aç">
              <Bell className="w-5 h-5" />
              {notifGranted && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />}
            </button>
            <div className="flex shrink-0 items-center gap-1 rounded-lg bg-secondary/60 p-1">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {(user.username || user.full_name || user.email || 'A')[0].toUpperCase()}
              </div>
              <div className="hidden min-[430px]:block">
                <p className="text-xs font-semibold leading-tight">Yönetici</p>
                <p className="text-[10px] text-muted-foreground leading-tight max-w-[90px] truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </header>
        <header className="hidden lg:flex sticky top-0 z-20 glass border-b border-border h-14 items-center px-6">
          <Link to="/" className="p-2 rounded-lg hover:bg-secondary" title="Ana Sayfa"><Home className="w-5 h-5" /></Link>
          <span className="ml-2 font-bold">Admin Panel</span>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <button onClick={handleNotif} className="p-2 rounded-lg hover:bg-secondary relative shrink-0" title="Bildirimleri Aç">
              <Bell className="w-5 h-5" />
              {notifGranted && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/60">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {(user.username || user.full_name || user.email || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Yönetici</p>
                <p className="text-xs text-muted-foreground leading-tight max-w-[160px] truncate">{user.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}