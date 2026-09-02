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
      if (!active) return;
      setBadges({
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
    const openThread = (event) => { openThreadRef.current = event.detail?.friendshipId || null; load(); };
    const closeThread = () => { openThreadRef.current = null; };
    let refreshTimer = null;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { if (active) load(); }, 250);
    };
    window.addEventListener('social-badges-refresh', refresh);
    window.addEventListener('social-thread-open', openThread);
    window.addEventListener('social-thread-close', closeThread);
    window.addEventListener('online', refresh);
    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      offFriends();
      offMessages();
      window.removeEventListener('social-badges-refresh', refresh);
      window.removeEventListener('social-thread-open', openThread);
      window.removeEventListener('social-thread-close', closeThread);
      window.removeEventListener('online', refresh);
    };
  }, [userId]);

  return badges;
}