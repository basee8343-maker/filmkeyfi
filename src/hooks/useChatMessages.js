import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { upsertMessage, sortMessages } from '@/lib/realtimeMessages';

/**
 * Sohbet mesajları hook'u — belirli bir conversationId için mesajları yükler ve realtime dinler.
 *
 * Koruma mekanizmaları:
 * 1. activeIdRef: conversationId değişince eski async sonuçları ignore edilir
 * 2. seenRef: aynı messageId iki kez eklenmez (duplicate önlemi)
 * 3. temp mesaj eşleştirme: optimistic mesaj realtime geldiğinde değiştirilir
 * 4. cleanup: conversationId değişince eski subscription kapatılır
 * 5. deleted_for: kullanıcı bazlı silme — sadece silen kullanıcıdan gizlenir
 */
export default function useChatMessages(conversationId) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const userId = user?.id;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const seenRef = useRef(new Set());
  const activeIdRef = useRef(conversationId);

  useEffect(() => {
    activeIdRef.current = conversationId;
  }, [conversationId]);

  const load = useCallback(async () => {
    if (!conversationId || !userId) { setLoading(false); return; }
    const reqId = conversationId;
    try {
      const items = await base44.entities.ChatMessage.filter({ conversation_id: conversationId }, 'created_date', 500);
      if (activeIdRef.current !== reqId) return; // stale request — başka sohbete geçildi
      const visible = (items || []).filter((m) => !(m.deleted_for || []).includes(userId));
      seenRef.current = new Set(visible.map((m) => m.id));
      setMessages(() => sortMessages(visible));
      setLoading(false);
    } catch {
      if (activeIdRef.current !== reqId) return;
      setLoading(false);
    }
  }, [conversationId, userId]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!conversationId) return;
    // State'i senkron temizle — eski sohbetin mesajları bir frame bile görünmesin
    setMessages([]);
    setLoading(true);
    seenRef.current = new Set();
    loadRef.current();

    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.conversation_id !== conversationId) return;
      if (event.type === 'delete') {
        setMessages((prev) => prev.filter((m) => m.id !== event.id));
        return;
      }
      const msg = event.data;
      if (!msg || !userId) return;
      // Kullanıcı bazlı silme: deleted_for içinde bu kullanıcı varsa gizle
      if ((msg.deleted_for || []).includes(userId)) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        return;
      }
      // Duplicate önlemi: aynı messageId varsa güncelle, yoksa ekle
      if (seenRef.current.has(msg.id)) {
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, ...msg } : m));
        return;
      }
      seenRef.current.add(msg.id);
      setMessages((prev) => {
        // Optimistic mesajı eşleştir ve değiştir
        const tempMatch = prev.find((m) => m.id?.startsWith('temp-') && m.sender_id === msg.sender_id && m.content === msg.content);
        const clean = tempMatch ? prev.filter((m) => m.id !== tempMatch.id) : prev;
        return upsertMessage(clean, msg);
      });
    });

    return () => unsub();
  }, [conversationId, userId]);

  const send = useCallback(async (content) => {
    if (!conversationId || !userId || !content.trim()) return;
    const tempId = 'temp-' + Date.now();
    const optimistic = {
      id: tempId, conversation_id: conversationId,
      sender_id: userId, sender_name: user?.username || user?.full_name || 'Kullanıcı',
      receiver_id: '', content: content.trim(),
      deleted_for: [], read_by: [userId],
      created_date: new Date().toISOString(),
    };
    setMessages((prev) => sortMessages([...prev, optimistic]));
    try {
      setSending(true);
      await base44.functions.invoke('dm-service', { action: 'send', conversation_id: conversationId, content: content.trim() });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast({ title: 'Mesaj gönderilemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
      throw err;
    } finally {
      setSending(false);
    }
  }, [conversationId, userId, user, toast]);

  const markRead = useCallback(async () => {
    if (!conversationId || !userId) return;
    try {
      await base44.functions.invoke('dm-service', { action: 'mark_read', conversation_id: conversationId });
      window.dispatchEvent(new Event('social-badges-refresh'));
    } catch {}
  }, [conversationId, userId]);

  // Mesaj sil: sadece bu kullanıcı için gizle, karşı taraf görmeye devam eder
  const deleteMessage = useCallback(async (messageId) => {
    if (!messageId) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    seenRef.current.delete(messageId);
    try {
      await base44.functions.invoke('dm-service', { action: 'delete_message', message_id: messageId });
    } catch (err) {
      if (activeIdRef.current === conversationId) loadRef.current();
      toast({ title: 'Silinemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
    }
  }, [toast, conversationId]);

  // Sohbeti sil: sadece bu kullanıcı için gizle, karşı taraf etkilenmez
  const deleteConversation = useCallback(async () => {
    if (!conversationId || !userId) return;
    try {
      await base44.functions.invoke('dm-service', { action: 'delete_conversation', conversation_id: conversationId });
      setMessages([]);
      seenRef.current = new Set();
      window.dispatchEvent(new Event('social-badges-refresh'));
    } catch (err) {
      toast({ title: 'Sohbet silinemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
      throw err;
    }
  }, [conversationId, userId, toast]);

  return { messages, loading, sending, send, markRead, deleteMessage, deleteConversation };
}