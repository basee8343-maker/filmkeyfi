import { useEffect, useRef, useState } from 'react';
import { Image } from '@/components/ui/image';

export default function RoomNotifications({ participants, currentUserId }) {
  const [notifications, setNotifications] = useState([]);
  const prevRef = useRef([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    const list = participants || [];
    const prev = prevRef.current;
    const prevIds = new Set(prev.map((p) => p.user_id));
    const currIds = new Set(list.map((p) => p.user_id));

    if (initializedRef.current) {
      const joined = list.filter((p) => !prevIds.has(p.user_id) && p.user_id !== currentUserId);
      const left = prev.filter((p) => !currIds.has(p.user_id) && p.user_id !== currentUserId);
      joined.forEach((p) => addNotif(p, 'join'));
      left.forEach((p) => addNotif(p, 'leave'));
    }

    prevRef.current = list;
    initializedRef.current = true;
  }, [participants, currentUserId]);

  const addNotif = (participant, type) => {
    const id = Date.now() + '-' + Math.random().toString(36).slice(2);
    setNotifications((current) => [...current, { id, participant, type, exiting: false }]);
    setTimeout(() => setNotifications((current) => current.map((n) => (n.id === id ? { ...n, exiting: true } : n))), 2500);
    setTimeout(() => setNotifications((current) => current.filter((n) => n.id !== id)), 3000);
  };

  if (!notifications.length) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[55] flex flex-col items-center gap-1.5 pointer-events-none w-max max-w-[85%]">
      {notifications.map((n) => (
        <div key={n.id} className={`flex items-center gap-2 bg-card/95 border border-border rounded-full pl-1.5 pr-3 py-1 shadow-lg backdrop-blur-md ${n.exiting ? (n.type === 'join' ? 'room-notif-out-left' : 'room-notif-out-right') : 'room-notif-in'}`}>
          {n.participant.avatar ? <Image src={n.participant.avatar} className="w-6 h-6 rounded-full shrink-0" fittingType="fill" /> : <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center text-[11px] font-bold shrink-0">{(n.participant.name || '?')[0]}</span>}
          <span className="text-xs font-medium whitespace-nowrap">{n.participant.name} {n.type === 'join' ? 'odaya katıldı' : 'odadan ayrıldı'}</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${n.type === 'join' ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      ))}
    </div>
  );
}