import { useEffect, useState } from 'react';
import ProfileFrame from '@/components/ProfileFrame';

// Çerçeveli kullanıcı odaya girince/çıkınca çıkan özel floating kart.
// Soldan kayarak girer, 4 sn sonra sağa kayarak kaybolur.
// Çerçevenin altında kırmızı zeminli beyaz yazıyla "[isim] odaya katıldı/odadan ayrıldı" yazar.
// Film ekranını kapatmaz (pointer-events-none).
export default function ProfileFrameEntrance({ frame, avatar, name, scale, panX, panY, hideName, isEntry = true, onDone }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setExiting(true), 4000); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (!exiting) return; const timer = setTimeout(() => onDone?.(), 400); return () => clearTimeout(timer); }, [exiting, onDone]);
  return (
    <div className={`pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),1.5rem)] z-[200] flex flex-col items-center px-3 ${exiting ? 'room-notif-out-right' : 'slide-in-left'}`}>
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-visible drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <ProfileFrame frame={frame} avatar={avatar} name={name} size="sm" frameScale={scale} panX={panX} panY={panY} />
      </div>
      <div className="mt-2 max-w-[85vw] rounded-lg border-2 border-red-400 bg-red-600 px-3 py-1.5 text-center shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
        <p className="truncate text-sm font-bold text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>{hideName ? (isEntry ? 'katıldı' : 'ayrıldı') : `${name} ${isEntry ? 'katıldı' : 'ayrıldı'}`}</p>
      </div>
    </div>
  );
}