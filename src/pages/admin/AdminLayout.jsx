import { useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Film, FolderTree, LifeBuoy, CreditCard, Bell, Settings, LogOut, Menu, X, ShieldAlert, KeyRound, ChevronDown, ChevronRight, Package as PackageIcon, Home, Flag, MessageCircle, Video, Smartphone, Moon, Target, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAdminNotifications, requestNotificationPermission } from '@/hooks/useAdminNotifications';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/lib/ThemeContext';
import { Image } from '@/components/ui/image';

const SIDEBAR_BG = '#111116';
const SIDEBAR_TEXT = '#e0e0e0';
const SIDEBAR_HEADING = '#a855f7';
const SIDEBAR_SELECTED = 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(124,58,237,0.1))';
const LOGOUT_COLOR = '#ef4444';

const navGroups = [
  {
    title: null,
    items: [
      { to: '/', label: 'Ana Sayfa', icon: Home, end: true, external: true },
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: 'İçerik Yönetimi',
    items: [
      { to: '/admin/film-ekle', label: 'Film Yükle', icon: Film },
      { to: '/admin/kategoriler', label: 'Kategoriler', icon: FolderTree },
      { to: '/admin/destek', label: 'Destek Mesajları', icon: Target },
      { to: '/admin/tanitim-videosu', label: 'Tanıtım Videosu', icon: Video },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { to: '/admin/kullanicilar', label: 'Kullanıcılar', icon: Users },
      { to: '/admin/guvenlik', label: 'Güvenlik', icon: ShieldAlert },
      { to: '/admin/oturumlar', label: 'Oturumlar / Cihazlar', icon: Smartphone },
      { to: '/admin/bildirimler', label: 'Bildirimler', icon: Bell },
      { to: '/admin/telegram', label: 'Telegram Bildirimleri', icon: MessageCircle },
      { to: '/admin/sikayetler', label: 'Şikayetler', icon: Flag },
      { to: '/admin/guncellemeler', label: 'Güncelleme Duyuruları', icon: Sparkles },
      { to: '/admin/ayarlar', label: 'Ayarlar', icon: Settings },
    ],
  },
  {
    title: 'Ödemeler',
    items: [
      { to: '/admin/odeme', label: 'Ödemeler & Abonelikler', icon: CreditCard },
    ],
  },
];

export default function AdminLayout() {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const touchX = useRef(null);
  const touchY = useRef(null);
  const [twofaOk, setTwofaOk] = useState(() => sessionStorage.getItem('admin2fa') === 'ok');
  const [twofaCode, setTwofaCode] = useState('');
  const [twofaErr, setTwofaErr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [notifGranted, setNotifGranted] = useState(() => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
  const { unreadCount } = useAdminNotifications();
  const { cycleTheme } = useTheme();
  const handleNotif = async () => { const r = await requestNotificationPermission(); setNotifGranted(r === 'granted'); };

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) navigate('/');
  }, [user, loading]);

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="bg-[#16161e] border border-purple-500/20 rounded-xl p-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-3"><KeyRound className="w-5 h-5 text-purple-400" /><h1 className="text-lg font-bold text-white">Admin 2FA Doğrulama</h1></div>
          <p className="text-sm text-gray-400 mb-4">Admin paneline erişim için authenticator kodunuzu girin.</p>
          <input value={twofaCode} onChange={(e) => setTwofaCode(e.target.value)} maxLength={6} placeholder="6 haneli kod" className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/40 mb-2 border border-white/5" />
          {twofaErr && <p className="text-xs text-red-400 mb-2">{twofaErr}</p>}
          <button onClick={verify2fa} disabled={verifying || twofaCode.length !== 6} className="w-full text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>{verifying ? 'Doğrulanıyor...' : 'Doğrula'}</button>
          <button onClick={() => base44.auth.logout('/login')} className="w-full mt-2 text-sm text-gray-400 py-2">Çıkış</button>
        </div>
      </div>
    );
  }

  const logout = () => { sessionStorage.removeItem('admin2fa'); base44.auth.logout('/login'); };

  const renderItem = (n, isTree = false) => {
    const Icon = n.icon;
    if (n.external) {
      return (
        <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
          style={{ color: SIDEBAR_TEXT }}>
          <Icon className="w-4 h-4 shrink-0" style={{ color: SIDEBAR_HEADING }} /> {n.label}
          <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-600" />
        </Link>
      );
    }
    return (
      <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
        className={({ isActive }) => `flex items-center gap-3 ${isTree ? 'px-3 py-2' : 'px-3 py-2.5'} rounded-lg text-sm font-medium transition-all`}
        style={({ isActive }) => ({
          color: SIDEBAR_TEXT,
          background: isActive ? SIDEBAR_SELECTED : 'transparent',
        })}>
        {({ isActive }) => (
          <>
            <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? '#c084fc' : SIDEBAR_HEADING }} /> {n.label}
            <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: isActive ? '#c084fc' : '#4a4a55' }} />
          </>
        )}
      </NavLink>
    );
  };

  const renderGroup = (g) => {
    if (!g.title) {
      return <div key="main" className="space-y-0.5 mb-2">{g.items.map((n) => renderItem(n))}</div>;
    }
    return (
      <div key={g.title} className="mb-3">
        <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: SIDEBAR_HEADING }}>{g.title}</p>
        {g.tree ? (
          <div className="relative ml-4 space-y-0.5" style={{ borderLeft: `1px solid ${SIDEBAR_HEADING}33` }}>
            {g.items.map((n) => (
              <div key={n.to} className="relative">
                <div className="absolute left-0 top-1/2 w-3 h-px" style={{ background: `${SIDEBAR_HEADING}33` }} />
                <div className="ml-4">{renderItem(n, true)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">{g.items.map((n) => renderItem(n))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-64 flex flex-col pt-[max(env(safe-area-inset-top),0rem)] lg:pt-0 transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: SIDEBAR_BG, borderRight: '1px solid rgba(168,85,247,0.1)' }}>
        <div className="px-4 py-4 flex items-center justify-between">
          <Link to="/admin" className="text-lg font-extrabold tracking-tight" style={{ color: SIDEBAR_TEXT }}>
            <span className="text-gradient">FILM</span>KEYFİ <span className="block text-[10px] font-normal tracking-widest mt-0.5" style={{ color: SIDEBAR_HEADING }}>ADMIN PANEL</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1.5 rounded-full bg-white/5" style={{ color: SIDEBAR_TEXT }}><X className="w-4 h-4" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2">
          {navGroups.map(renderGroup)}
        </nav>
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid rgba(168,85,247,0.1)' }}>
          <div className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ background: '#16161e' }}>
            {user?.avatar ? <Image src={user.avatar} className="w-9 h-9 rounded-full object-cover shrink-0" fittingType="fill" /> : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)', color: '#fff' }}>{(user?.username || user?.full_name || user?.email || 'A')[0].toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate flex items-center gap-1" style={{ color: SIDEBAR_TEXT }}>👑 {user?.username || user?.full_name || 'Admin'}</p>
              <p className="text-[10px] truncate" style={{ color: '#6b7280' }}>{user?.email}</p>
            </div>
            <button onClick={cycleTheme} className="p-1.5 rounded-lg shrink-0" style={{ color: SIDEBAR_HEADING }} title="Tema değiştir">
              <Moon className="w-4 h-4" />
            </button>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium border" style={{ color: LOGOUT_COLOR, borderColor: `${LOGOUT_COLOR}40`, background: `${LOGOUT_COLOR}10` }}>
            <LogOut className="w-4 h-4" /> Çıkış Yap
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 min-w-0 overflow-x-hidden"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; touchY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touchX.current ?? 0); const dy = e.changedTouches[0].clientY - (touchY.current ?? 0); if (Math.abs(dx) > Math.abs(dy) * 1.5 && dx > 80) setOpen(true); else if (Math.abs(dx) > Math.abs(dy) * 1.5 && dx < -80) setOpen(false); }}>
        <header className="lg:hidden sticky top-0 z-20 border-b border-purple-500/10 min-h-14 flex items-center px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] bg-[#111116]/95 backdrop-blur"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; touchY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touchX.current ?? 0); const dy = e.changedTouches[0].clientY - (touchY.current ?? 0); if (Math.abs(dx) > Math.abs(dy) * 1.5 && dx > 80) setOpen(true); else if (Math.abs(dx) > Math.abs(dy) * 1.5 && dx < -80) setOpen(false); }}>
          <button onClick={() => setOpen(true)}><Menu className="w-6 h-6 text-white" /></button>
          <span className="ml-1 hidden min-[390px]:block font-bold text-white whitespace-nowrap">Admin Panel</span>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            <ThemeToggle />
            <button onClick={() => navigate('/admin/bildirimler')} className="p-2 rounded-lg hover:bg-white/5 relative shrink-0" title="Bildirimler">
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              {notifGranted && unreadCount === 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />}
            </button>
            <div className="flex shrink-0 items-center gap-1 rounded-lg bg-[#16161e] p-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
                {(user.username || user.full_name || user.email || 'A')[0].toUpperCase()}
              </div>
              <div className="hidden min-[430px]:block">
                <p className="text-xs font-semibold leading-tight text-white">Yönetici</p>
                <p className="text-[10px] text-gray-400 leading-tight max-w-[90px] truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </header>
        <header className="hidden lg:flex sticky top-0 z-20 border-b border-purple-500/10 h-14 items-center px-6 bg-[#111116]/95 backdrop-blur">
          <Link to="/" className="p-2 rounded-lg hover:bg-white/5" title="Ana Sayfa"><Home className="w-5 h-5 text-white" /></Link>
          <span className="ml-2 font-bold text-white">Admin Panel</span>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => navigate('/admin/bildirimler')} className="p-2 rounded-lg hover:bg-white/5 relative shrink-0" title="Bildirimler">
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              {notifGranted && unreadCount === 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16161e]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
                {(user.username || user.full_name || user.email || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight text-white">Yönetici</p>
                <p className="text-xs text-gray-400 leading-tight max-w-[160px] truncate">{user.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
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