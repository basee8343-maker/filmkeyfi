import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { parseRoleMetadata } from '@/lib/roles';

export default function NeonEntrance({ roomId }) {
  const [flash, setFlash] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsub = base44.entities.RoomMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      const msg = event.data;
      if (!msg || msg.room_id !== roomId || msg.type !== 'system') return;
      const { text, color, animation, hasRole } = parseRoleMetadata(msg.text);
      if (!hasRole || !color || !text.includes('odaya katıldı')) return;

      const displayText = text.replace(' odaya katıldı.', '');
      setFlash({ text: displayText, color, animation: animation || 'pulse', key: msg.id });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFlash(null), 3500);
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, [roomId]);

  if (!flash) return null;

  return (
    <div className="absolute inset-0 z-[75] pointer-events-none flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 neon-flash-overlay" style={{ '--role-color': flash.color }} />
      <div key={flash.key} className="relative text-center px-6" style={{ animation: `neon-role-${flash.animation} 3.5s ease-out forwards`, color: flash.color, textShadow: `0 0 20px ${flash.color}, 0 0 40px ${flash.color}, 0 0 60px ${flash.color}` }}>
        <p className="text-2xl font-extrabold">{flash.text}</p>
        <p className="text-sm font-semibold text-white/90 mt-1" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>odaya katıldı</p>
      </div>
    </div>
  );
}