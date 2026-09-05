import { useEffect, useRef, useState } from 'react';
import FriendshipLevelBadge, { getFriendshipLevelTheme } from '@/components/friends/FriendshipLevelBadge';

export default function FriendshipLevelCard({ progression }) {
  const level = progression?.level || 1;
  const current = progression?.current_level_message_count || 0;
  const theme = getFriendshipLevelTheme(level);
  const previousLevel = useRef(null);
  const [levelUp, setLevelUp] = useState(null);
  useEffect(() => {
    const previous = previousLevel.current;
    previousLevel.current = level;
    if (!previous || level <= previous) return;
    const maxKey = `filmkeyfi_max_level_${progression?.id || 'friendship'}`;
    if (level === 1000 && localStorage.getItem(maxKey)) return;
    if (level === 1000) localStorage.setItem(maxKey, '1');
    setLevelUp({ previous, level });
    const timer = setTimeout(() => setLevelUp(null), 2600);
    return () => clearTimeout(timer);
  }, [level, progression?.id]);
  return <><div className={`mx-3 mt-3 shrink-0 rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-accent/10 p-3 shadow-lg ${theme.bubble}`}><div className="flex items-center gap-3"><FriendshipLevelBadge level={level} variant="card" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">Arkadaşlık Seviyesi</p><p className="text-xs text-muted-foreground"><span className="font-bold text-accent">{level === 1000 ? 'MAX LEVEL' : `${current} / 50 mesaj`}</span></p><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${theme.progress}`} style={{ width: `${level === 1000 ? 100 : current * 2}%` }} /></div><p className="mt-1 text-right text-[10px] text-muted-foreground">{level === 1000 ? 'Maksimum seviyeye ulaşıldı' : `${50 - current} mesaj sonra LVL ${level + 1}`}</p></div></div></div>{levelUp && <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-background/70 backdrop-blur-sm friendship-level-up"><div className={`rounded-3xl border bg-card px-8 py-7 text-center shadow-2xl ${theme.bubble}`}><p className="text-xs font-black tracking-[0.2em] text-accent">{levelUp.level === 1000 ? 'MAX LEVEL' : 'FRIENDSHIP LEVEL UP'}</p><div className="mt-4 flex items-center gap-4"><FriendshipLevelBadge level={levelUp.previous} /><span className="text-2xl text-primary">→</span><FriendshipLevelBadge level={levelUp.level} variant="card" /></div></div></div>}</>;
}