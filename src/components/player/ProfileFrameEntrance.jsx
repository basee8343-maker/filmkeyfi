import { useEffect } from 'react';
import ProfileFrame from '@/components/ProfileFrame';

export default function ProfileFrameEntrance({ frame, avatar, name, scale, onDone }) {
  useEffect(() => { const timer = setTimeout(() => onDone?.(), 2600); return () => clearTimeout(timer); }, [onDone]);
  return <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.5rem)] z-[200] flex justify-center px-3 room-notif-in"><div className="flex max-w-sm items-center gap-3 rounded-2xl border border-white/15 bg-black/80 px-3 py-2 text-white shadow-2xl backdrop-blur-xl"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-visible"><ProfileFrame frame={frame} avatar={avatar} name={name} size="sm" frameScale={scale} /></div><div className="min-w-0"><p className="truncate text-sm font-bold">{name}</p><p className="text-xs text-white/70">odaya katıldı</p></div></div></div>;
}