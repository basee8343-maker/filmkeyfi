import { useEffect, useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { upsertMessage, sortMessages } from '@/lib/realtimeMessages';

/**
 * Birebir sohbet için oda sohbetiyle aynı realtime + DB mimarisini kullanır.
 * Belirli bir friendship_id için mesajları veritabanından yükler,
 * realtime subscription ile anında günceller, optimistic send yapar.
 */
export default function useDirectMessages(friendshipId) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const userId = user?.id;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const seenRef = useRef(new Set());

  const load = useCallback(() => {
    if (!friendshipId) return;
    base44.entities.DirectMessage.filter({ friendship_id: friendshipId }, 'created_date', 500)
      .then((items) => {
        const visible = items.filter((m) => !(m.hidden_for || []).includes(userId));
        seenRef.current = new Set(visible.map((m) => m.id));
        setMessages((current) => {
          const temps = current.filter((m) => m.id?.startsWith('temp-'));
          return sortMessages([...temps, ...visible]);
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [friendshipId, userId]);

  useEffect(() => {
    if (!friendshipId) return;
    setMessages([]);
    setLoading(true);
    seenRef.current = new Set();
    load();
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.data?.friendship_id !== friendshipId) return;
      if (event.type === 'delete') {
        setMessages((prev) => prev.filter((m) => m.id !== event.id));
        return;
      }
      if ((event.data?.hidden_for || []).includes(userId)) {
        setMessages((prev) => prev.filter((m) => m.id !== event.data.id));
        return;
      }
      seenRef.current.add(event.data.id);
      setMessages((prev) => {
        const tempMatch = prev.find((m) => m.id?.startsWith('temp-') && m.sender_id === event.data.sender_id && m.text === event.data.text);
        const clean = tempMatch ? prev.filter((m) => m.id !== tempMatch.id) : prev;
        return upsertMessage(clean, event.data);
      });
    });
    const reconnect = () => load();
    window.addEventListener('online', reconnect);
    return () => { unsub(); window.removeEventListener('online', reconnect); };
  }, [friendshipId, load]);

  const send = useCallback(async (text) => {
    if (!friendshipId || !userId || !text.trim()) return;
    const tempId = 'temp-' + Date.now();
    const optimistic = {
      id: tempId,
      friendship_id: friendshipId,
      sender_id: userId,
      sender_name: user?.username || user?.full_name || 'Kullanıcı',
      recipient_id: '',
      participants: [userId],
      read_by: [userId],
      text: text.trim(),
      created_date: new Date().toISOString(),
    };
    setMessages((prev) => sortMessages([...prev, optimistic]));
    try {
      setSending(true);
      await base44.functions.invoke('friend-service', { action: 'send', friendship_id: friendshipId, text: text.trim() });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast({ title: 'Mesaj gönderilemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
      throw err;
    } finally {
      setSending(false);
    }
  }, [friendshipId, userId, user, toast]);

  const markRead = useCallback(async () => {
    if (!friendshipId || !userId) return;
    try {
      await base44.functions.invoke('friend-service', { action: 'mark_read', friendship_id: friendshipId });
      window.dispatchEvent(new Event('social-badges-refresh'));
    } catch {}
  }, [friendshipId, userId]);

  const del = useCallback(async (messageId) => {
    if (!messageId) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      const msg = await base44.entities.DirectMessage.get(messageId);
      const hiddenFor = [...new Set([...(msg.hidden_for || []), userId])];
      await base44.entities.DirectMessage.update(messageId, { hidden_for: hiddenFor });
    } catch (err) {
      load();
      toast({ title: 'Silinemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
    }
  }, [userId, toast, load]);

  const clearAll = useCallback(async () => {
    if (!friendshipId || !userId) return;
    try {
      await base44.functions.invoke('friend-service', { action: 'clear_chat', friendship_id: friendshipId });
      setMessages([]);
      window.dispatchEvent(new Event('social-badges-refresh'));
    } catch (err) {
      toast({ title: 'Temizlenemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
    }
  }, [friendshipId, userId, toast]);

  return { messages, loading, sending, send, markRead, del, clearAll };
}