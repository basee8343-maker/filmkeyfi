import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';

/**
 * Sohbet listesi hook'u — kullanıcının silmediği tüm sohbetleri getirir.
 * Realtime: yeni sohbet oluşturulduğunda, mesaj geldiğinde, sohbet silindiğinde anında günceller.
 */
export default function useConversations() {
  const { user } = useCurrentUser();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const all = await base44.entities.Conversation.filter({ members: user.id }, '-updated_date', 200);
      const visible = (all || []).filter((c) => !(c.deleted_for || []).includes(user.id));
      setConversations(visible);
    } catch {}
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
    if (!user) return;
    const unsub = base44.entities.Conversation.subscribe((event) => {
      if (event.type === 'delete') {
        setConversations((prev) => prev.filter((c) => c.id !== event.id));
        return;
      }
      const convo = event.data;
      if (!convo || !(convo.members || []).includes(user.id)) return;
      setConversations((prev) => {
        // Kullanıcı sildiyse listeden çıkar
        if ((convo.deleted_for || []).includes(user.id)) {
          return prev.filter((c) => c.id !== convo.id);
        }
        const exists = prev.find((c) => c.id === convo.id);
        if (exists) {
          return prev.map((c) => c.id === convo.id ? { ...c, ...convo } : c);
        }
        return [convo, ...prev];
      });
    });
    const reconnect = () => load();
    window.addEventListener('online', reconnect);
    return () => { unsub(); window.removeEventListener('online', reconnect); };
  }, [user?.id, load]);

  const optimisticHide = useCallback((conversationId) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
  }, []);

  return { conversations, loading, reload: load, optimisticHide };
}