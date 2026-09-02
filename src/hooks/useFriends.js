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
    const offFriends = base44.entities.Friendship.subscribe(reload);
    const offMessages = base44.entities.DirectMessage.subscribe(reload);
    return () => { offFriends(); offMessages(); };
  }, [user?.id, reload]);
  const invoke = async (payload) => {
    try { const res = await base44.functions.invoke('friend-service', payload); await reload(); return res.data; }
    catch (error) { toast({ title: 'İşlem başarısız', description: error.response?.data?.error || error.message, variant: 'destructive' }); throw error; }
  };
  return { user, relations, messages, loading, reload, invoke };
}