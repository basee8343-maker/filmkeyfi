import { useEffect, useRef, useState } from 'react';
import { Image } from '@/components/ui/image';
import { FRAME_DEFINITIONS, getRoleInfo } from '@/lib/roles';

export default function RoomNotifications({ participants, currentUserId, profiles = {} }) {
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
    <div className="absolute top-[max(env(safe-area-inset-top),0.75rem)] left-1/2 -translate-x-1/2 z-[55] flex flex-col items-center gap-1.5 pointer-events-none w-max max-w-[85%]">
      {notifications.map((n) => {
        const profile = profiles[n.participant.user_id] || {};
        const color = FRAME_DEFINITIONS[profile.profile_frame]?.colors?.[0] || getRoleInfo(profile).color || (n.type === 'join' ? '#22c55e' : '#ef4444');
        const avatar = n.participant.avatar || profile.avatar;
        const name = profile.title || n.participant.name || 'Kullanıcı';
        return <div key={n.id} className={`flex min-w-52 items-center gap-2 rounded-2xl border bg-black/90 px-3 py-2 shadow-2xl backdrop-blur-xl ${n.exiting ? (n.type === 'join' ? 'room-notif-out-left' : 'room-notif-out-right') : 'room-notif-in'}`} style={{ borderColor: `${color}99`, color, boxShadow: `0 0 18px ${color}55, inset 0 0 14px ${color}18` }}>
          {avatar ? <Image src={avatar} className="h-9 w-9 shrink-0 rounded-full border" style={{ borderColor: color }} fittingType="fill" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-black text-sm font-black" style={{ borderColor: color }}>{name[0]}</span>}
          <span className="min-w-0 flex-1 text-center leading-tight"><strong className="block truncate text-base font-black tracking-wide">{name}</strong><small className="block text-[10px] font-semibold opacity-80">{n.type === 'join' ? 'odaya katıldı' : 'odadan ayrıldı'}</small></span>
        </div>;
      })}
    </div>
  );
}