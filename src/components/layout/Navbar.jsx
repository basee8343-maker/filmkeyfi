import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, Menu, X, LogOut, Shield, Smartphone, Headphones } from 'lucide-react';
import DownloadButtons from '@/components/DownloadButtons';
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { Image } from '@/components/ui/image';

const links = [
  { label: 'Ana Sayfa', path: '/' },
  { label: 'Filmler', path: '/filmler' },
  { label: 'Açık Odalar', path: '/acik-odalar' },
  { label: 'Kategoriler', path: '/kategoriler' },
  { label: 'Listem', path: '/listem' },
  { label: 'Arkadaşlar', path: '/arkadaslar' },
];

export default function Navbar() {
  const { user } = useCurrentUser();
  const isActive = membershipActive(user);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    base44.entities.Notification.filter({ user_id: user.id, read: false }, '-created_date', 50)
      .then((r) => setUnread(r.length)).catch(() => {});
    const unsub = base44.entities.Notification.subscribe(() => {
      base44.entities.Notification.filter({ user_id: user.id, read: false }, '-created_date', 50)
        .then((r) => setUnread(r.length)).catch(() => {});
    });
    return unsub;
  }, [user?.id]);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/ara?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  };

  const logout = () => { base44.auth.logout('/login'); };

  return (
    <>
    {open && <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)} />}
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border pt-[max(env(safe-area-inset-top),1.5rem)] glass lg:pt-0">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <span className="text-xl font-extrabold tracking-tight">
            <span className="text-gradient">FILM</span>
            <span className="text-foreground">KEYFİ</span>
          </span>
        </Link>

        {isActive && (
        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {links.map((l) => (
            <Link key={l.path} to={l.path}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === l.path ? 'text-foreground bg-secondary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        )}

        {isActive && (
        <form onSubmit={submit} className="hidden md:flex items-center ml-auto bg-secondary/60 rounded-full px-3 py-1.5 w-44 lg:w-64 focus-within:ring-2 focus-within:ring-ring">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Film, dizi ara..."
            className="bg-transparent outline-none px-2 text-sm w-full placeholder:text-muted-foreground" />
        </form>
        )}

        <div className="flex items-center gap-1 ml-auto md:ml-2">
          <Link to="/destek" className="flex min-w-11 flex-col items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Destek">
            <Headphones className="w-5 h-5" />
            <span className="text-[9px] font-semibold leading-none">Destek</span>
          </Link>
          <Link to="/bildirimler" className="relative p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
            {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">{unread}</span>}
          </Link>
          {isActive && (
          <Link to="/profil" className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full p-1 pr-1 transition-colors hover:bg-secondary sm:pr-3" aria-label="Bilgilerim">
            {user?.avatar ? <Image src={user.avatar} className="w-9 h-9 rounded-full" fittingType="fill" /> : <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{(user?.username || user?.full_name || 'K')[0]}</span>}
            <span className="hidden sm:block max-w-28 truncate text-sm font-semibold">{user?.username || user?.full_name || 'Profil'}</span>
          </Link>
          )}
          <button onClick={logout} className="hidden sm:block p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
          <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-full hover:bg-secondary text-foreground">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border glass px-4 py-3 space-y-1">
          <form onSubmit={submit} className="flex items-center bg-secondary/60 rounded-full px-3 py-2 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara..." className="bg-transparent outline-none px-2 text-sm w-full" />
          </form>
          {isActive && links.map((l) => (
            <Link key={l.path} to={l.path} onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${location.pathname === l.path ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}>
              {l.label}
            </Link>
          ))}
          {!isActive && (
            <Link to="/abonelik" onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium bg-primary/20 text-primary">
              Abonelik
            </Link>
          )}
          <Link to="/güvenlik-protokolü" onClick={() => setOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground flex items-center gap-2 hover:bg-secondary">
            <Shield className="w-4 h-4" /> Güvenlik Protokolü
          </Link>
          <div className="pt-2 mt-2 border-t border-border">
            <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2"><Smartphone className="w-4 h-4" /> Telefona İndir</p>
            <DownloadButtons variant="dark" />
          </div>
          <button onClick={logout} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-destructive flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Çıkış Yap
          </button>
        </div>
      )}
    </header>
    </>
  );
}