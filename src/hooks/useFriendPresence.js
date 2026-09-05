import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useFriendPresence(user, maintain = false) {
  const [presence, setPresence] = useState([]);
  const [now, setNow] = useState(Date.now());
  const ownRef = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    const records = await base44.entities.UserPresence.list('-updated_date', 200);
    setPresence(records);
    let own = records.find((record) => record.user_id === user.id);
    if (maintain) {
      const data = { online: document.visibilityState === 'visible' && navigator.onLine, last_seen: new Date().toISOString() };
      own = own
        ? await base44.entities.UserPresence.update(own.id, data)
        : await base44.entities.UserPresence.create({ user_id: user.id, ...data });
      setPresence((current) => [own, ...current.filter((record) => record.user_id !== user.id)]);
    }
    ownRef.current = own;
  }, [user?.id, maintain]);

  useEffect(() => {
    if (!user) return;
    load();
    const off = base44.entities.UserPresence.subscribe((event) => {
      const id = event.data?.id || event.id;
      setPresence((current) => {
        if (event.type === 'delete') return current.filter((item) => item.id !== id);
        const existing = current.find((item) => item.id === id);
        const merged = { ...(existing || {}), ...(event.data || {}), id };
        if (merged.user_id === user.id) ownRef.current = merged;
        return [merged, ...current.filter((item) => item.id !== id)];
      });
      setNow(Date.now());
    });
    if (!maintain) return off;

    const update = async (online) => {
      const data = { online, last_seen: new Date().toISOString() };
      if (!ownRef.current) {
        ownRef.current = await base44.entities.UserPresence.create({ user_id: user.id, ...data });
      } else {
        ownRef.current = { ...ownRef.current, ...data };
        await base44.entities.UserPresence.update(ownRef.current.id, data);
      }
      setNow(Date.now());
    };
    const syncVisibility = () => update(document.visibilityState === 'visible' && navigator.onLine).catch(() => {});
    const goOffline = () => update(false).catch(() => {});
    const heartbeat = setInterval(syncVisibility, 10000);
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('online', syncVisibility);
    window.addEventListener('offline', syncVisibility);
    window.addEventListener('pagehide', goOffline);
    window.addEventListener('beforeunload', goOffline);
    return () => {
      clearInterval(heartbeat);
      off();
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('online', syncVisibility);
      window.removeEventListener('offline', syncVisibility);
      window.removeEventListener('pagehide', goOffline);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, [user?.id, load, maintain]);

  const isOnline = (userId) => {
    const record = presence.find((item) => item.user_id === userId);
    return Boolean(record?.online && now - new Date(record.last_seen).getTime() < 30000);
  };
  const getRoomId = (userId) => presence.find((item) => item.user_id === userId)?.current_room_id || '';
  const getLastSeen = (userId) => presence.find((item) => item.user_id === userId)?.last_seen || null;
  return { isOnline, getRoomId, getLastSeen };
}