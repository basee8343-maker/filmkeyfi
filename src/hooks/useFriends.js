import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

/**
 * Arkadaşlık yönetimi hook'u — sadece arkadaşlık ilişkilerini yönetir.
 * DM/özel mesaj yönetimi useConversations ve useChatMessages hook'larına taşındı.
 */
export default function useFriends() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const friendships = await base44.entities.Friendship.filter({ members: user.id }, '-updated_date', 200);
      setRelations(friendships);
    } catch {}
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    reload();
    if (!user) return;
    const offFriends = base44.entities.Friendship.subscribe((event) => {
      setRelations((current) => {
        if (event.type === 'create') return current.some((r) => r.id === event.id) ? current : [event.data, ...current];
        if (event.type === 'update') return current.map((r) => r.id === event.id ? { ...r, ...event.data } : r);
        return current.filter((r) => r.id !== event.id);
      });
    });
    const reconnect = () => reload();
    window.addEventListener('online', reconnect);
    // Polling yedeği — realtime kaçırsa diye 10sn'de bir yenile
    const interval = setInterval(reload, 10000);
    return () => { offFriends(); window.removeEventListener('online', reconnect); clearInterval(interval); };
  }, [user?.id, reload]);

  const invoke = async (payload) => {
    try {
      const res = await base44.functions.invoke('friend-service', payload);
      if (['request', 'respond', 'unfriend', 'block', 'unblock'].includes(payload.action)) await reload();
      window.dispatchEvent(new Event('social-badges-refresh'));
      return res.data;
    } catch (error) {
      toast({ title: 'İşlem başarısız', description: error.response?.data?.error || error.message, variant: 'destructive' });
      throw error;
    }
  };

  return { user, relations, loading, reload, invoke };
}