import { useEffect, useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { upsertMessage, sortMessages } from '@/lib/realtimeMessages';

/**
 * Birebir sohbet hook'u — race condition ve stale state problemlerine karşı korumalı:
 *
 * 1. activeIdRef: şu anki friendshipId'yi takip eder. Async yüklemenin sonucu
 *    başka bir sohbete geçildikten sonra tamamlanırsa, sonuç ignore edilir.
 * 2. readyRef: cleared_at yüklenene kadar realtime event'ler bloklanır.
 *    Bu, eski mesajların subscription'dan içeri sızmasını engeller.
 *    Hata durumunda açılır ki realtime mesajlar gelebilsin.
 * 3. clearedAtRef: "sohbeti sil" zaman damgası. Bu tarihten önceki mesajlar
 *    sadece silene gizlenir, karşı taraf görmeye devam eder.
 * 4. seenRef: duplicate mesaj önlemi — aynı messageId iki kez eklenmez.
 * 5. loadRef: effect'in sadece friendshipId/userId değişince yeniden çalışmasını sağlar.
 */
export default function useDirectMessages(friendshipId) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const userId = user?.id;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const seenRef = useRef(new Set());
  const clearedAtRef = useRef(null);
  const readyRef = useRef(false);
  const activeIdRef = useRef(friendshipId);

  useEffect(() => {
    activeIdRef.current = friendshipId;
  }, [friendshipId]);

  const load = useCallback(async () => {
    if (!friendshipId || !userId) {
      setLoading(false);
      return;
    }
    readyRef.current = false;
    const reqId = friendshipId;
    try {
      const fship = await base44.entities.Friendship.get(friendshipId);
      if (activeIdRef.current !== reqId) return; // stale request — başka sohbete geçildi
      clearedAtRef.current = fship?.cleared_at?.[userId] || null;
      readyRef.current = true; // cleared_at hazır — artık realtime event'ler işlenebilir
      const items = await base44.entities.DirectMessage.filter({ friendship_id: friendshipId }, 'created_date', 500);
      if (activeIdRef.current !== reqId) return; // stale request
      const clearedAt = clearedAtRef.current;
      const visible = (items || []).filter((m) => {
        if ((m.hidden_for || []).includes(userId)) return false; // kullanıcı bazlı silme
        if (clearedAt && new Date(m.created_date) <= new Date(clearedAt)) return false; // sohbet silme
        return true;
      });
      seenRef.current = new Set(visible.map((m) => m.id));
      setMessages((current) => {
        const temps = current.filter((m) => m.id?.startsWith('temp-'));
        return sortMessages([...temps, ...visible]);
      });
      setLoading(false);
    } catch {
      if (activeIdRef.current !== reqId) return;
      // Yükleme başarısız olsa bile realtime event'leri işle — karşı taraf mesajları görebilsin
      readyRef.current = true;
      clearedAtRef.current = null;
      setLoading(false);
    }
  }, [friendshipId, userId]);

  // load'u ref'te tut — effect her render'da güncel load'u çağırsın
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!friendshipId) return;
    // State'i senkron temizle — eski sohbetin mesajları bir frame bile görünmesin
    setMessages([]);
    setLoading(true);
    seenRef.current = new Set();
    clearedAtRef.current = null;
    readyRef.current = false;
    loadRef.current();

    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.data?.friendship_id !== friendshipId) return;
      // cleared_at yüklenene kadar hiçbir realtime event'i işleme — eski mesajlar sızmasın
      if (!readyRef.current) return;
      if (event.type === 'delete') {
        setMessages((prev) => prev.filter((m) => m.id !== event.id));
        return;
      }
      // Kullanıcı bazlı silme: hidden_for içinde bu kullanıcı varsa gizle
      if ((event.data?.hidden_for || []).includes(userId)) {
        setMessages((prev) => prev.filter((m) => m.id !== event.data.id));
        return;
      }
      // Sohbet silme: cleared_at'ten önceki mesajları gizle
      const clearedAt = clearedAtRef.current;
      if (clearedAt && event.data?.created_date && new Date(event.data.created_date) <= new Date(clearedAt)) {
        return;
      }
      // Duplicate önlemi: aynı messageId iki kez eklenmesin
      if (seenRef.current.has(event.data.id)) return;
      seenRef.current.add(event.data.id);
      setMessages((prev) => {
        // Optimistic mesajı eşleştir ve değiştir
        const tempMatch = prev.find((m) => m.id?.startsWith('temp-') && m.sender_id === event.data.sender_id && m.text === event.data.text);
        const clean = tempMatch ? prev.filter((m) => m.id !== tempMatch.id) : prev;
        return upsertMessage(clean, event.data);
      });
    });

    const reconnect = () => loadRef.current();
    window.addEventListener('online', reconnect);
    return () => { unsub(); window.removeEventListener('online', reconnect); };
  }, [friendshipId, userId]); // userId değişince de yeniden çalış — user async yüklenir

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

  // Kullanıcı bazlı silme: mesajı veritabanından silme, sadece hidden_for'a kullanıcı ID'sini ekle
  // Karşı taraf mesajı görmeye devam eder
  const del = useCallback(async (messageId) => {
    if (!messageId) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    seenRef.current.delete(messageId);
    try {
      const msg = await base44.entities.DirectMessage.get(messageId);
      const hiddenFor = [...new Set([...(msg.hidden_for || []), userId])];
      await base44.entities.DirectMessage.update(messageId, { hidden_for: hiddenFor });
    } catch (err) {
      if (activeIdRef.current === friendshipId) loadRef.current();
      toast({ title: 'Silinemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
    }
  }, [userId, toast, friendshipId]);

  // Sohbeti sil: cleared_at zaman damgasını ayarla, bu tarihten önceki mesajlar silene gizlenir
  // Karşı taraf tüm mesajları görmeye devam eder
  const clearAll = useCallback(async () => {
    if (!friendshipId || !userId) return;
    setMessages([]);
    seenRef.current = new Set();
    clearedAtRef.current = new Date().toISOString();
    try {
      await base44.functions.invoke('friend-service', { action: 'clear_chat', friendship_id: friendshipId });
      window.dispatchEvent(new Event('social-badges-refresh'));
    } catch (err) {
      if (activeIdRef.current === friendshipId) loadRef.current();
      toast({ title: 'Temizlenemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
    }
  }, [friendshipId, userId, toast]);

  return { messages, loading, sending, send, markRead, del, clearAll };
}