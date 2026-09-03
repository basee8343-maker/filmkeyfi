import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Rol prefix'li sistem mesajlarını tespit eder (emoji ile başlıyorsa rol mesajıdır)
function isRoleJoinMessage(text) {
  return text.includes('odaya katıldı') && /^\p{Extended_Pictographic}/u.test(text);
}

export default function NeonEntrance({ roomId, currentUser }) {
  const [flash, setFlash] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsub = base44.entities.RoomMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      const msg = event.data;
      if (!msg || msg.room_id !== roomId || msg.type !== 'system') return;
      if (!isRoleJoinMessage(msg.text)) return;

      // "icon label name odaya katıldı." → "icon label name"
      const text = msg.text.replace(' odaya katıldı.', '');
      setFlash({ text, key: msg.id });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFlash(null), 3500);
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, [roomId]);

  if (!flash) return null;

  return (
    <div className="absolute inset-0 z-[75] pointer-events-none flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 neon-flash-overlay" />
      <div key={flash.key} className="relative text-center neon-flash-text px-6">
        <p className="text-2xl font-extrabold" style={{ color: 'hsl(var(--accent))', textShadow: '0 0 20px hsl(var(--accent)), 0 0 40px hsl(var(--accent)), 0 0 60px hsl(var(--accent))' }}>
          {flash.text}
        </p>
        <p className="text-sm font-semibold text-white/90 mt-1" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>odaya katıldı</p>
      </div>
    </div>
  );
}