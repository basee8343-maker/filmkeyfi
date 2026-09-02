import { Link, useLocation } from 'react-router-dom';
import { Home, Film, Plus, MessageCircle, DoorOpen, CreditCard, Users } from 'lucide-react';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import useSocialBadges from '@/hooks/useSocialBadges';

const fullItems = [
  { label: 'Ana Sayfa', path: '/', icon: Home },
  { label: 'Filmler', path: '/filmler', icon: Film },
  { label: 'Oda Kur', path: '/oda-kur', icon: Plus },
  { label: 'Odalar', path: '/acik-odalar', icon: DoorOpen },
  { label: 'Sohbet', path: '/destek', icon: MessageCircle },
  { label: 'Arkadaşlar', path: '/arkadaslar', icon: Users },
];

const limitedItems = [
  { label: 'Abonelik', path: '/abonelik', icon: CreditCard },
  { label: 'Sohbet', path: '/destek', icon: MessageCircle },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useCurrentUser();
  const { messages } = useSocialBadges(user?.id);
  const items = membershipActive(user) ? fullItems : limitedItems;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-border">
      <div className="flex h-16">
        {items.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <Link key={path} to={path} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
              {active && <span className="absolute top-0 h-1 w-8 rounded-full bg-primary" />}
              <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              {path === '/arkadaslar' && messages > 0 && <span className="absolute right-[22%] top-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">{messages > 99 ? '99+' : messages}</span>}
              <span className={`text-[10px] ${active ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}