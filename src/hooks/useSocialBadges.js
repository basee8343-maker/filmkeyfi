import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useSocialBadges(userId) {
  const [badges, setBadges] = useState({ requests: 0, messages: 0 });

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
    const offMessages = base44.entities.DirectMessage.subscribe(load);
    window.addEventListener('social-badges-refresh', load);
    return () => {
      active = false;
      offFriends();
      offMessages();
      window.removeEventListener('social-badges-refresh', load);
    };
  }, [userId]);

  return badges;
}