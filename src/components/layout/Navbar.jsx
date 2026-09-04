import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import ProfileDropdown from '@/components/layout/ProfileDropdown';

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
  const [q, setQ] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/ara?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-[max(env(safe-area-inset-top),1.5rem)] lg:pt-0"
      style={{ background: 'linear-gradient(135deg, #1a1c22 0%, #2b2e36 50%, #1a1c22 100%)', borderBottom: '1px solid rgba(174,184,196,0.12)' }}>
      {/* Animated grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `linear-gradient(rgba(174,184,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(174,184,196,0.06) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
      {/* Moving glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-8 -left-10 w-32 h-32 rounded-full blur-3xl opacity-20 animate-pulse" style={{ background: 'radial-gradient(circle, #8B31FF, transparent 70%)' }} />
        <div className="absolute -top-4 right-20 w-24 h-24 rounded-full blur-3xl opacity-15 animate-pulse" style={{ background: 'radial-gradient(circle, #ffcc00, transparent 70%)', animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <span className="text-xl font-extrabold tracking-tight">
            <span className="text-gradient">FILM</span>
            <span className="text-white/90">KEYFİ</span>
          </span>
        </Link>

        {isActive && (
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {links.map((l) => (
              <Link key={l.path} to={l.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === l.path ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        {isActive && (
          <form onSubmit={submit} className="hidden md:flex items-center ml-auto bg-white/5 rounded-full px-3 py-1.5 w-44 lg:w-64 focus-within:ring-2 focus-within:ring-white/20">
            <Search className="w-4 h-4 text-white/40 shrink-0" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Film, dizi ara..."
              className="bg-transparent outline-none px-2 text-sm w-full placeholder:text-white/40 text-white" />
          </form>
        )}

        <div className="flex items-center gap-2 ml-auto md:ml-2">
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}