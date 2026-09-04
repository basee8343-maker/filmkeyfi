import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useFriendPresence(user, maintain = false) {
  const [presence, setPresence] = useState([]);
  const [now, setNow] = useState(Date.now());
  const ownRef = useRef(null);
  const presenceRef = useRef([]);
  const flushTimerRef = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    const records = await base44.entities.UserPresence.list('-updated_date', 200);
    presenceRef.current = records;
    setPresence(records);
    let own = records.find((record) => record.user_id === user.id);
    if (!own && maintain) own = await base44.entities.UserPresence.create({ user_id: user.id, online: true, last_seen: new Date().toISOString() });
    ownRef.current = own;
  }, [user?.id, maintain]);

  useEffect(() => {
    if (!user) return;
    load();
    const flush = () => { flushTimerRef.current = null; setPresence([...presenceRef.current]); };
    const scheduleFlush = () => { if (!flushTimerRef.current) flushTimerRef.current = setTimeout(flush, 2000); };
    const off = base44.entities.UserPresence.subscribe((event) => {
      const current = presenceRef.current;
      if (event.type === 'create') {
        if (!current.some((item) => item.id === event.id)) { presenceRef.current = [...current, event.data]; scheduleFlush(); }
      } else if (event.type === 'update') {
        presenceRef.current = current.map((item) => item.id === event.id ? { ...item, ...event.data } : item);
        scheduleFlush();
      } else {
        presenceRef.current = current.filter((item) => item.id !== event.id);
        scheduleFlush();
      }
    });
    if (!maintain) return () => { off(); if (flushTimerRef.current) clearTimeout(flushTimerRef.current); };
    const update = async (online) => {
      if (!ownRef.current) return;
      const data = { online, last_seen: new Date().toISOString() };
      ownRef.current = { ...ownRef.current, ...data };
      await base44.entities.UserPresence.update(ownRef.current.id, data);
    };
    const heartbeat = setInterval(() => { setNow(Date.now()); update(document.visibilityState === 'visible' && navigator.onLine).catch(() => {}); }, 25000);
    const visibility = () => update(document.visibilityState === 'visible' && navigator.onLine).catch(() => {});
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', visibility);
    window.addEventListener('offline', visibility);
    return () => {
      clearInterval(heartbeat);
      off();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('online', visibility);
      window.removeEventListener('offline', visibility);
      update(false).catch(() => {});
    };
  }, [user?.id, load, maintain]);

  const isOnline = (userId) => {
    const record = presence.find((item) => item.user_id === userId);
    return Boolean(record?.online && now - new Date(record.last_seen).getTime() < 60000);
  };
  const getRoomId = (userId) => presence.find((item) => item.user_id === userId)?.current_room_id || '';
  return { isOnline, getRoomId };
}