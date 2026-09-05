import { Link, useLocation } from 'react-router-dom';
import { Home, Film, Plus, MessageCircle, DoorOpen, CreditCard, Headphones } from 'lucide-react';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import useSocialBadges from '@/hooks/useSocialBadges';

const fullItems = [
  { label: 'Ana Sayfa', path: '/', icon: Home },
  { label: 'Filmler', path: '/filmler', icon: Film },
  { label: 'Oda Kur', path: '/oda-kur', icon: Plus },
  { label: 'Odalar', path: '/acik-odalar', icon: DoorOpen },
  { label: 'Sohbet', path: '/arkadaslar?view=chats', activePath: '/arkadaslar', icon: MessageCircle },
];

const limitedItems = [
  { label: 'Abonelik', path: '/abonelik', icon: CreditCard },
  { label: 'Destek', path: '/destek', icon: Headphones },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useCurrentUser();
  const { messages, requests } = useSocialBadges(user?.id);
  const items = membershipActive(user) ? fullItems : limitedItems;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 overflow-hidden" style={{ background: 'linear-gradient(180deg, #14141a 0%, #0a0a0f 100%)', borderTop: '1px solid rgba(168,85,247,0.12)' }}>
      <div className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }} />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-6 left-1/4 w-24 h-24 rounded-full blur-3xl opacity-25 animate-pulse" style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
        <div className="absolute -bottom-4 right-1/4 w-20 h-20 rounded-full blur-3xl opacity-15 animate-pulse" style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)', animationDelay: '1.5s' }} />
      </div>

      <div className="relative flex h-16 items-center">
        {items.map(({ label, path, activePath, icon: Icon }, idx) => {
          const matchPath = activePath || path;
          const active = location.pathname === matchPath || (matchPath !== '/' && location.pathname.startsWith(matchPath));
          const isCenter = idx === 2 && items === fullItems;
          if (isCenter) {
            return (
              <Link key={path} to={path} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
                <span className="-mt-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90" style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 0 16px rgba(124,58,237,0.5)' }}>
                  <Icon className="w-6 h-6 text-white" />
                </span>
                <span className="text-[10px] text-white/60 font-medium">{label}</span>
              </Link>
            );
          }
          return (
            <Link key={path} to={path} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform">
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full" style={{ background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />}
              <Icon className={`w-5 h-5 ${active ? 'text-purple-400' : 'text-white/50'}`} />
              {activePath === '/arkadaslar' && messages > 0 && <span className="absolute right-[18%] top-1 min-w-5 h-5 px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">{messages > 99 ? '99+' : messages}</span>}
              {activePath === '/arkadaslar' && requests > 0 && <span className="absolute right-[30%] top-0 w-3 h-3 rounded-full bg-red-500 border-2 border-[#14141a]" aria-label="Yeni arkadaşlık isteği" />}
              <span className={`text-[10px] ${active ? 'text-white font-semibold' : 'text-white/50'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}