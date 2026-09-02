import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function useFriends() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [relations, setRelations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!user) return;
    const [friendships, directMessages] = await Promise.all([
      base44.entities.Friendship.list('-updated_date', 200),
      base44.entities.DirectMessage.list('created_date', 500)
    ]);
    setRelations(friendships); setMessages(directMessages); setLoading(false);
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
      setMessages((current) => {
        if (event.type === 'create') return current.some((message) => message.id === event.id) ? current : [...current, event.data];
        if (event.type === 'update') return current.map((message) => message.id === event.id ? { ...message, ...event.data } : message);
        return current.filter((message) => message.id !== event.id);
      });
    });
    return () => { offFriends(); offMessages(); };
  }, [user?.id, reload]);
  const invoke = async (payload) => {
    try {
      const res = await base44.functions.invoke('friend-service', payload);
      if (payload.action === 'send' && res.data.message) setMessages((current) => current.some((message) => message.id === res.data.message.id) ? current : [...current, res.data.message]);
      else await reload();
      window.dispatchEvent(new Event('social-badges-refresh'));
      return res.data;
    } catch (error) { toast({ title: 'İşlem başarısız', description: error.response?.data?.error || error.message, variant: 'destructive' }); throw error; }
  };
  return { user, relations, messages, loading, reload, invoke };
}