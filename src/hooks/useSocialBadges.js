import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useSocialBadges(userId) {
  const [badges, setBadges] = useState({ requests: 0, messages: 0 });
  const openThreadRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = async () => {
      const [requests, conversations] = await Promise.all([
        base44.entities.Friendship.filter({ recipient_id: userId, status: 'pending' }, '-created_date', 100),
        base44.entities.Conversation.filter({ members: userId }, '-updated_date', 200),
      ]);
      if (!active) return;
      const unread = (conversations || []).reduce((sum, c) => {
        if ((c.deleted_for || []).includes(userId)) return sum;
        return sum + (c.user1_id === userId ? (c.unread_user1 || 0) : (c.unread_user2 || 0));
      }, 0);
      setBadges({ requests: requests.length, messages: unread });
    };
    let loadTimer = null;
    const debouncedLoad = () => {
      if (loadTimer) clearTimeout(loadTimer);
      loadTimer = setTimeout(() => { if (active) load(); }, 200);
    };
    load();
    const offFriends = base44.entities.Friendship.subscribe(debouncedLoad);
    const offConvos = base44.entities.Conversation.subscribe((event) => {
      const convo = event.data;
      if (!convo || !(convo.members || []).includes(userId)) return;
      debouncedLoad();
    });
    // ChatMessage subscription — yeni mesaj geldiğinde de badge'i anlık güncelle
    const offMsgs = base44.entities.ChatMessage.subscribe((event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.sender_id !== userId && msg.receiver_id !== userId) return;
      debouncedLoad();
    });
    const openThread = (event) => { openThreadRef.current = event.detail?.conversationId || null; setBadges((current) => ({ ...current, messages: 0 })); debouncedLoad(); };
    const closeThread = () => { openThreadRef.current = null; };
    window.addEventListener('social-badges-refresh', debouncedLoad);
    window.addEventListener('social-thread-open', openThread);
    window.addEventListener('social-thread-close', closeThread);
    window.addEventListener('online', debouncedLoad);
    return () => {
      active = false;
      if (loadTimer) clearTimeout(loadTimer);
      offFriends();
      offConvos();
      offMsgs();
      window.removeEventListener('social-badges-refresh', debouncedLoad);
      window.removeEventListener('social-thread-open', openThread);
      window.removeEventListener('social-thread-close', closeThread);
      window.removeEventListener('online', debouncedLoad);
    };
  }, [userId]);

  return badges;
}