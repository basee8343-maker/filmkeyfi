import { useEffect } from 'react';
import ProfileFrame from '@/components/ProfileFrame';

// Çerçeveli kullanıcı odaya girince çıkan özel floating giriş kartı.
// Kutu/arka plan YOK — sadece profil çerçevesi ortada, isim ve "ayırdı" yazısı altında.
// 3 sn sonra kaybolur, film ekranını kapatmaz (pointer-events-none).
export default function ProfileFrameEntrance({ frame, avatar, name, scale, panX, panY, hideName, onDone }) {
  useEffect(() => { const timer = setTimeout(() => onDone?.(), 3000); return () => clearTimeout(timer); }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),1.5rem)] z-[200] flex flex-col items-center px-3 room-notif-in">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-visible drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <ProfileFrame frame={frame} avatar={avatar} name={name} size="sm" frameScale={scale} panX={panX} panY={panY} />
      </div>
      {!hideName && (
        <p className="mt-1.5 max-w-[80vw] truncate text-sm font-bold text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.6)' }}>{name}</p>
      )}
      <p className="text-xs font-semibold tracking-wide" style={{ color: '#facc15', textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 8px rgba(250,204,21,0.5)' }}>ayırdı</p>
    </div>
  );
}