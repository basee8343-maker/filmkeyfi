import { useState, useRef } from 'react';
import { MessageCircle, UsersRound, X, Shield, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { isModerator } from '@/lib/roles';
import useFriends from '@/hooks/useFriends';
import useConversations from '@/hooks/useConversations';
import useFriendPresence from '@/hooks/useFriendPresence';
import ConversationList from '@/components/friends/ConversationList';
import ChatPanel from '@/components/friends/ChatPanel';
import FriendsPanel from '@/components/friends/FriendsPanel';

export default function RoomDirectMessages({ onClose }) {
  const { user, relations, loading: friendsLoading, invoke } = useFriends();
  const { conversations, loading: convosLoading, optimisticHide } = useConversations();
  const { toast } = useToast();
  const { isOnline } = useFriendPresence(user);
  const [adminLoading, setAdminLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('messages');
  const touchStart = useRef({ x: 0, y: 0 });

  const startAdminChat = async () => {
    setAdminLoading(true);
    try {
      const res = await base44.functions.invoke('friend-service', { action: 'start_admin_chat' });
      const adminId = res?.data?.admin_id;
      if (!adminId) { toast({ title: 'Yönetici bulunamadı' }); return; }
      const convoRes = await base44.functions.invoke('dm-service', { action: 'start', target_id: adminId });
      if (convoRes?.data?.conversation) { setSelected(convoRes.data.conversation); }
    } catch (e) {
      toast({ title: 'Başlatılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setAdminLoading(false); }
  };

  const openChat = async (relation) => {
    const friendId = relation.requester_id === user.id ? relation.recipient_id : relation.requester_id;
    try {
      const res = await base44.functions.invoke('dm-service', { action: 'start', target_id: friendId });
      if (res?.data?.conversation) { setSelected(res.data.conversation); }
    } catch (e) {
      toast({ title: 'Sohbet açılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const hide = (conversation) => {
    optimisticHide(conversation.id);
    if (selected?.id === conversation.id) setSelected(null);
    base44.functions.invoke('dm-service', { action: 'delete_conversation', conversation_id: conversation.id }).catch(() => {});
  };

  if (friendsLoading || convosLoading || !user) return <div className="p-6 text-sm text-muted-foreground">Yükleniyor...</div>;
  if (selected) {
    const friendId = selected.user1_id === user.id ? selected.user2_id : selected.user1_id;
    return <ChatPanel conversation={selected} userId={user.id} onBack={() => setSelected(null)} online={isOnline(friendId)} embedded />;
  }
  return <section className="flex h-full flex-col bg-card pt-[max(env(safe-area-inset-top),1rem)] border-l border-border bg-card/95 backdrop-blur-xl" onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchStart.current.x; const dy = e.changedTouches[0].clientY - touchStart.current.y; if (dx > 80 && dx > Math.abs(dy) * 1.5) onClose(); }}><header className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="font-bold">Sohbetler</h2><div className="flex items-center gap-1">{!isModerator(user) && <button onClick={startAdminChat} disabled={adminLoading} className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25 disabled:opacity-50"><Shield className="w-3.5 h-3.5" /> Admin'e Mesaj</button>}<button onClick={onClose} className="p-2" aria-label="Kapat"><X className="w-5 h-5" /></button></div></header><div className="grid grid-cols-2 gap-2 border-b border-border p-3"><button onClick={() => setTab('messages')} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold ${tab === 'messages' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}><MessageCircle className="w-4 h-4" /> Mesajlar</button><button onClick={() => setTab('friends')} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold ${tab === 'friends' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}><UsersRound className="w-4 h-4" /> Arkadaşlar</button></div><button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('FILMKEYFİ\'ye katıl! 🎬🍿 https://flimkeyfii.base44.app')}`, '_blank', 'noopener,noreferrer')} className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white transition-transform active:scale-95" style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}><UserPlus className="w-4 h-4" /> Arkadaşını Davet Et</button><div className="min-h-0 flex-1 overflow-y-auto">{tab === 'messages' ? <ConversationList conversations={conversations} userId={user.id} onOpen={setSelected} onHide={hide} isOnline={isOnline} /> : <div className="p-3"><FriendsPanel relations={relations} userId={user.id} invoke={invoke} onChat={openChat} isOnline={isOnline} /></div>}</div></section>;
}