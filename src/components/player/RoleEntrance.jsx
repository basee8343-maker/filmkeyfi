import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ProfileFrameEntrance from '@/components/player/ProfileFrameEntrance';

export default function RoleEntrance({ roomId, joinTrigger = 0, userId }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const processed = useRef(new Set());
  const processMessage = useCallback((message) => {
    if (!message || message.room_id !== roomId || message.type !== 'system' || processed.current.has(message.id)) return;
    const match = (message.text || '').match(/^\{\{PFRAME\|([^|}]+)\|([0-9]+)\}\}/);
    if (!match || !message.text.includes('odaya katıldı')) return;
    if (userId && message.user_id === userId) return;
    processed.current.add(message.id);
    setQueue((items) => [...items.slice(-4), { key: message.id, frame: match[1], scale: Number(match[2]) || 100, avatar: message.user_avatar || '', name: message.user_name || 'Kullanıcı' }]);
  }, [roomId]);
  const fetchRecent = useCallback(() => base44.entities.RoomMessage.filter({ room_id: roomId, type: 'system' }, '-created_date', 15).then((items) => items.filter((item) => Date.now() - new Date(item.created_date).getTime() < 20000).reverse().forEach(processMessage)).catch(() => {}), [roomId, processMessage]);
  useEffect(() => { fetchRecent(); const off = base44.entities.RoomMessage.subscribe((event) => event.type === 'create' && processMessage(event.data)); return off; }, [fetchRecent, processMessage]);
  useEffect(() => { if (joinTrigger > 0) fetchRecent(); }, [joinTrigger, fetchRecent]);
  useEffect(() => { if (!current && queue.length) { setCurrent(queue[0]); setQueue((items) => items.slice(1)); } }, [current, queue]);
  if (!current) return null;
  return <ProfileFrameEntrance key={current.key} {...current} onDone={() => setCurrent(null)} />;
}