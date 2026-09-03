import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

export function useAdminNotifications() {
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifiedRef = useRef(new Set());
  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    if (!user?.id) return;
    const items = await base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 50).catch(() => []);
    setNotifications(items);
    setUnreadCount(items.filter(n => !n.read).length);
    items.forEach(n => notifiedRef.current.add(n.id));
  }, [user?.id]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  // Real-time subscription — admin panele girmeden de çalışan in-app bildirim
  useEffect(() => {
    if (!isAdmin || !user?.id) return;
    const unsub = base44.entities.Notification.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.user_id === user.id && !notifiedRef.current.has(ev.data.id)) {
        notifiedRef.current.add(ev.data.id);
        setNotifications(prev => [ev.data, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
        // In-app notification (tab açıkken)
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new Notification(ev.data.title, { body: ev.data.body || '', icon: '/favicon.ico' });
            n.onclick = () => { if (ev.data.link) window.location.href = ev.data.link; n.close(); };
            setTimeout(() => n.close(), 8000);
          } catch {}
        }
      }
      if (ev.type === 'update' && ev.data?.user_id === user.id) {
        setNotifications(prev => prev.map(n => n.id === ev.data.id ? { ...n, ...ev.data } : n));
        load();
      }
      if (ev.type === 'delete' && ev.data?.user_id === user.id) {
        setNotifications(prev => prev.filter(n => n.id !== ev.data.id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    });
    return unsub;
  }, [isAdmin, user?.id, load]);

  // Service Worker + Push setup (uygulama kapalıyken bildirim)
  useEffect(() => {
    if (!isAdmin) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const setupPush = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;
        const keyRes = await base44.functions.invoke('web-push', { action: 'get-key' });
        if (!keyRes?.publicKey) return;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey)
        });
        await base44.functions.invoke('web-push', { action: 'subscribe', subscription: sub });
      } catch {}
    };
    setupPush();
  }, [isAdmin]);

  const markRead = useCallback(async (id) => {
    await base44.entities.Notification.update(id, { read: true }).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await base44.entities.Notification.update(n.id, { read: true }).catch(() => {});
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [notifications]);

  return { notifications, unreadCount, markRead, markAllRead, reload: load };
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}