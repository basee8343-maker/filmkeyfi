import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const MessageRealtimeContext = createContext(null);
const sortConversations = (items) => [...items].sort((a, b) => new Date(b.last_message_at || b.updated_date || 0) - new Date(a.last_message_at || a.updated_date || 0));

export function useMessageRealtime() {
  const value = useContext(MessageRealtimeContext);
  if (!value) throw new Error('MessageRealtimeProvider gerekli');
  return value;
}

export default function MessageRealtimeProvider({ userId, children }) {
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const openThread = useRef(null);
  const reload = useCallback(async () => {
    if (!userId) return;
    const [items, pending] = await Promise.all([base44.entities.Conversation.filter({ members: userId }, '-updated_date', 200), base44.entities.Friendship.filter({ recipient_id: userId, status: 'pending' }, '-created_date', 100)]);
    setConversations(sortConversations((items || []).filter((item) => !(item.deleted_for || []).includes(userId))));
    setRequests(pending.length); setLoading(false);
  }, [userId]);
  useEffect(() => {
    if (!userId) { setConversations([]); setRequests(0); setLoading(false); return; }
    setLoading(true); reload();
    const offConversations = base44.entities.Conversation.subscribe((event) => {
      const id = event.data?.id || event.id;
      setConversations((current) => {
        if (event.type === 'delete') return current.filter((item) => item.id !== id);
        const existing = current.find((item) => item.id === id);
        if (!existing && !(event.data?.members || []).includes(userId)) return current;
        const merged = { ...(existing || {}), ...(event.data || {}), id };
        if (openThread.current === id) {
          if (merged.user1_id === userId) merged.unread_user1 = 0;
          else merged.unread_user2 = 0;
        }
        if ((merged.deleted_for || []).includes(userId)) return current.filter((item) => item.id !== id);
        return sortConversations([merged, ...current.filter((item) => item.id !== id)]);
      });
    });
    const offMessages = base44.entities.ChatMessage.subscribe((event) => {
      const message = event.data;
      if (!message || (message.sender_id !== userId && message.receiver_id !== userId)) return;
      window.dispatchEvent(new CustomEvent('filmkeyfi-message-realtime', { detail: event }));
      if (event.type !== 'create') return;
      setConversations((current) => sortConversations(current.map((item) => item.id !== message.conversation_id ? item : { ...item, last_message_text: message.content || '[Görsel]', last_message_at: message.created_date, last_sender_id: message.sender_id, ...(message.receiver_id === userId && openThread.current !== item.id ? (item.user1_id === userId ? { unread_user1: (item.unread_user1 || 0) + 1 } : { unread_user2: (item.unread_user2 || 0) + 1 }) : {}) })));
      if (message.receiver_id === userId && openThread.current === message.conversation_id) setTimeout(() => base44.functions.invoke('dm-service', { action: 'mark_read', conversation_id: message.conversation_id }).catch(() => {}), 150);
    });
    const offFriends = base44.entities.Friendship.subscribe(() => base44.entities.Friendship.filter({ recipient_id: userId, status: 'pending' }, '-created_date', 100).then((items) => setRequests(items.length)).catch(() => {}));
    const opened = (event) => { openThread.current = event.detail?.conversationId || null; setConversations((current) => current.map((item) => item.id !== openThread.current ? item : { ...item, ...(item.user1_id === userId ? { unread_user1: 0 } : { unread_user2: 0 }) })); };
    const closed = () => { openThread.current = null; };
    const reconnect = () => reload(); const visible = () => { if (document.visibilityState === 'visible') reload(); };
    window.addEventListener('social-thread-open', opened); window.addEventListener('social-thread-close', closed); window.addEventListener('online', reconnect); document.addEventListener('visibilitychange', visible);
    return () => { offConversations(); offMessages(); offFriends(); window.removeEventListener('social-thread-open', opened); window.removeEventListener('social-thread-close', closed); window.removeEventListener('online', reconnect); document.removeEventListener('visibilitychange', visible); };
  }, [userId, reload]);
  const badges = useMemo(() => ({ requests, messages: conversations.reduce((sum, item) => sum + (item.user1_id === userId ? item.unread_user1 || 0 : item.unread_user2 || 0), 0) }), [requests, conversations, userId]);
  const optimisticHide = useCallback((id) => setConversations((items) => items.filter((item) => item.id !== id)), []);
  return <MessageRealtimeContext.Provider value={{ conversations, loading, reload, optimisticHide, badges }}>{children}</MessageRealtimeContext.Provider>;
}