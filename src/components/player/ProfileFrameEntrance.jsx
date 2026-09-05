import { useEffect } from 'react';
import ProfileFrame from '@/components/ProfileFrame';

export default function ProfileFrameEntrance({ frame, avatar, name, scale, hideName, onDone }) {
  useEffect(() => { const timer = setTimeout(() => onDone?.(), 3000); return () => clearTimeout(timer); }, [onDone]);
  return <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.5rem)] z-[200] flex justify-center px-3 room-notif-in"><div className="flex max-w-sm flex-col items-center gap-1 rounded-2xl border border-white/15 bg-black/80 px-4 py-3 text-white shadow-2xl backdrop-blur-xl"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-visible"><ProfileFrame frame={frame} avatar={avatar} name={name} size="sm" frameScale={scale} /></div>{!hideName && <p className="truncate text-sm font-bold">{name}</p>}<p className="text-xs text-white/70">odaya katıldı</p></div></div>;
}