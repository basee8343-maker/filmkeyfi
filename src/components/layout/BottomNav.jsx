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
  const { messages } = useSocialBadges(user?.id);
  const items = membershipActive(user) ? fullItems : limitedItems;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-black border-t border-white/10">
      <div className="flex h-16 items-center">
        {items.map(({ label, path, activePath, icon: Icon }, idx) => {
          const matchPath = activePath || path;
          const active = location.pathname === matchPath || (matchPath !== '/' && location.pathname.startsWith(matchPath));
          const isCenter = idx === 2 && items === fullItems;
          if (isCenter) {
            return (
              <Link key={path} to={path} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
                <span className="-mt-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #8B31FF, #5F24A1)' }}>
                  <Icon className="w-6 h-6 text-white" />
                </span>
                <span className="text-[10px] text-[#808080] font-medium">{label}</span>
              </Link>
            );
          }
          return (
            <Link key={path} to={path} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full" style={{ background: activePath === '/arkadaslar' ? '#D93F3F' : '#8B31FF' }} />}
              <Icon className={`w-5 h-5 ${active ? (activePath === '/arkadaslar' ? 'text-white' : 'text-[#8B31FF]') : 'text-[#808080]'}`} />
              {activePath === '/arkadaslar' && messages > 0 && <span className="absolute right-[22%] top-1 min-w-5 h-5 px-1 rounded-full bg-[#D93F3F] text-white text-[10px] font-bold flex items-center justify-center">{messages > 99 ? '99+' : messages}</span>}
              <span className={`text-[10px] ${active ? 'text-white font-semibold' : 'text-[#808080]'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}