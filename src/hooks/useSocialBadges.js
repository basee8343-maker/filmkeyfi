import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useSocialBadges(userId) {
  const [badges, setBadges] = useState({ requests: 0, messages: 0 });
  const openThreadRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = async () => {
      const [requests, messages] = await Promise.all([
        base44.entities.Friendship.filter({ recipient_id: userId, status: 'pending' }, '-created_date', 100),
        base44.entities.DirectMessage.filter({ recipient_id: userId }, '-created_date', 500),
      ]);
      if (active) setBadges({
        requests: requests.length,
        messages: messages.filter((message) => !(message.read_by || []).includes(userId)).length,
      });
    };
    load();
    const offFriends = base44.entities.Friendship.subscribe(load);
    const offMessages = base44.entities.DirectMessage.subscribe((event) => {
      if (event.data?.recipient_id !== userId) return;
      if (event.type === 'create') {
        if (event.data.friendship_id !== openThreadRef.current && !(event.data.read_by || []).includes(userId)) setBadges((current) => ({ ...current, messages: current.messages + 1 }));
        return;
      }
      load();
    });
    const clearReadThread = (event) => setBadges((current) => ({ ...current, messages: Math.max(0, current.messages - (event.detail?.count || 0)) }));
    const openThread = (event) => { openThreadRef.current = event.detail?.friendshipId || null; };
    const closeThread = () => { openThreadRef.current = null; };
    window.addEventListener('social-badges-refresh', load);
    window.addEventListener('social-thread-read', clearReadThread);
    window.addEventListener('online', load);
    window.addEventListener('social-thread-open', openThread);
    window.addEventListener('social-thread-close', closeThread);
    return () => {
      active = false;
      offFriends();
      offMessages();
      window.removeEventListener('social-badges-refresh', load);
      window.removeEventListener('social-thread-read', clearReadThread);
      window.removeEventListener('online', load);
      window.removeEventListener('social-thread-open', openThread);
      window.removeEventListener('social-thread-close', closeThread);
    };
  }, [userId]);

  return badges;
}