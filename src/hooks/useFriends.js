import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { mergeMessages, upsertMessage } from '@/lib/realtimeMessages';

export default function useFriends() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [relations, setRelations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!user) return;
    const [friendships, directMessages] = await Promise.all([
      base44.entities.Friendship.filter({ members: user.id }, '-updated_date', 200),
      base44.entities.DirectMessage.filter({ participants: user.id }, 'created_date', 500)
    ]);
    setRelations(friendships); setMessages((current) => mergeMessages(current, directMessages)); setLoading(false);
  }, [user?.id]);
  useEffect(() => {
    reload();
    if (!user) return;
    const offFriends = base44.entities.Friendship.subscribe((event) => {
      setRelations((current) => {
        if (event.type === 'create') return current.some((relation) => relation.id === event.id) ? current : [event.data, ...current];
        if (event.type === 'update') return current.map((relation) => relation.id === event.id ? { ...relation, ...event.data } : relation);
        return current.filter((relation) => relation.id !== event.id);
      });
    });
    const offMessages = base44.entities.DirectMessage.subscribe((event) => {
      const message = event.data;
      if (event.type === 'delete') { setMessages((current) => current.filter((item) => item.id !== event.id)); return; }
      if (event.type === 'create' && message?.sender_id !== user.id && message?.recipient_id !== user.id) return;
      setMessages((current) => upsertMessage(current, message));
    });
    const reconnect = () => reload();
    const resume = () => { if (document.visibilityState === 'visible') reload(); };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', resume);
    return () => { offFriends(); offMessages(); window.removeEventListener('online', reconnect); document.removeEventListener('visibilitychange', resume); };
  }, [user?.id, reload]);
  const invoke = async (payload) => {
    try {
      const readCount = payload.action === 'mark_read' ? messages.filter((message) => message.friendship_id === payload.friendship_id && message.recipient_id === user?.id && !(message.read_by || []).includes(user.id)).length : 0;
      const res = await base44.functions.invoke('friend-service', payload);
      if (payload.action === 'send' && res.data.message) setMessages((current) => upsertMessage(current, res.data.message));
      else if (payload.action !== 'typing') await reload();
      if (payload.action === 'mark_read' && readCount > 0) window.dispatchEvent(new CustomEvent('social-thread-read', { detail: { count: readCount } }));
      window.dispatchEvent(new Event('social-badges-refresh'));
      return res.data;
    } catch (error) { toast({ title: 'İşlem başarısız', description: error.response?.data?.error || error.message, variant: 'destructive' }); throw error; }
  };
  return { user, relations, messages, loading, reload, invoke };
}