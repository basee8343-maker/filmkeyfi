import { useEffect, useState } from 'react';
import { MessageCircle, UsersRound, Bell, Shield, UserPlus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ConversationList from '@/components/friends/ConversationList';
import FriendsPanel from '@/components/friends/FriendsPanel';
import ChatPanel from '@/components/friends/ChatPanel';
import useFriends from '@/hooks/useFriends';
import useConversations from '@/hooks/useConversations';
import useFriendPresence from '@/hooks/useFriendPresence';
import { useToast } from '@/components/ui/use-toast';
import { isModerator } from '@/lib/roles';

export default function Friends() {
  const { user, relations, loading: friendsLoading, invoke, reload: reloadFriends } = useFriends();
  const { conversations, loading: convosLoading, optimisticHide } = useConversations();
  const { isOnline, getRoomId } = useFriendPresence(user);
  const { toast } = useToast();
  const [adminLoading, setAdminLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  useEffect(() => {
    const load = async () => { const items = await base44.entities.Room.filter({ status: 'active' }, '-updated_date', 200).catch(() => []); setRooms(items); };
    load();
    const unsub = base44.entities.Room.subscribe(() => load());
    return () => unsub();
  }, []);
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(params.get('view') === 'chats' ? 'chats' : 'friends');
  const [selected, setSelected] = useState(null);

  // URL parametresinden sohbet aç
  useEffect(() => {
    const chatId = params.get('chat');
    if (!chatId) return;
    const convo = conversations.find((c) => c.id === chatId);
    if (convo) { setSelected(convo); setView('chat'); }
    else {
      base44.entities.Conversation.get(chatId)
        .then((c) => { if (c) { setSelected(c); setView('chat'); } })
        .catch(() => {});
    }
  }, [conversations, params]);

  const startAdminChat = async () => {
    setAdminLoading(true);
    try {
      const res = await base44.functions.invoke('friend-service', { action: 'start_admin_chat' });
      const friendship = res?.data?.friendship;
      if (!friendship) { toast({ title: 'Yönetici bulunamadı' }); return; }
      const adminId = friendship.requester_id === user.id ? friendship.recipient_id : friendship.requester_id;
      const convoRes = await base44.functions.invoke('dm-service', { action: 'start', target_id: adminId });
      if (convoRes?.data?.conversation) { setSelected(convoRes.data.conversation); setView('chat'); }
    } catch (e) {
      toast({ title: 'Başlatılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setAdminLoading(false); }
  };

  // Arkadaş listesinden sohbet aç — dm-service start ile yeni/aktif sohbet getir
  const openChat = async (relation) => {
    const friendId = relation.requester_id === user.id ? relation.recipient_id : relation.requester_id;
    try {
      const res = await base44.functions.invoke('dm-service', { action: 'start', target_id: friendId });
      if (res?.data?.conversation) { setSelected(res.data.conversation); setView('chat'); }
    } catch (e) {
      toast({ title: 'Sohbet açılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const openConversation = (conversation) => { setSelected(conversation); setView('chat'); };

  // Sohbeti sil — sadece bu kullanıcı için, karşı taraf etkilenmez
  const hide = (conversation) => {
    optimisticHide(conversation.id);
    if (selected?.id === conversation.id) { setSelected(null); setView('chats'); }
    base44.functions.invoke('dm-service', { action: 'delete_conversation', conversation_id: conversation.id }).catch(() => {});
  };

  const switchView = (next) => { setView(next); setSelected(null); setParams(next === 'chats' ? { view: 'chats' } : {}); };

  if (friendsLoading || convosLoading || !user) return <div className="p-6 text-[#808080]">Yükleniyor...</div>;
  const incomingRequests = relations.filter((r) => r.status === 'pending' && r.recipient_id === user.id).length;
  const totalUnread = conversations.reduce((sum, c) => sum + (c.user1_id === user.id ? (c.unread_user1 || 0) : (c.unread_user2 || 0)), 0);

  if (view === 'chat') {
    const friendId = selected?.user1_id === user.id ? selected?.user2_id : selected?.user1_id;
    return <div className="max-w-3xl mx-auto sm:p-4"><ChatPanel key={selected?.id} conversation={selected} userId={user.id} onBack={() => switchView('chats')} online={isOnline(friendId)} /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto min-h-[calc(100vh-8rem)] bg-black text-white">
      <header className="px-4 py-5">
        <h1 className="text-2xl font-extrabold">Arkadaşlar</h1>
        <p className="text-sm text-[#808080] mt-1">Sohbet ve arkadaşlarını yönet.</p>
        <div className="mt-4 flex gap-2 p-1 rounded-xl bg-[#1a1a1a]">
          <button onClick={() => switchView('chats')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'chats' ? 'text-white' : 'text-[#808080]'}`} style={view === 'chats' ? { background: '#5D1D1D' } : {}}>
            <MessageCircle className="w-4 h-4" /> Mesajlar
            {totalUnread > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-[#D93F3F] text-white text-[10px] flex items-center justify-center">{totalUnread}</span>}
          </button>
          <button onClick={() => switchView('friends')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'friends' ? 'text-white' : 'text-[#808080]'}`} style={view === 'friends' ? { background: '#5D1D1D' } : {}}>
            <UsersRound className="w-4 h-4" /> Arkadaşlarım
            {incomingRequests > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-[#D93F3F] text-white text-[10px] flex items-center justify-center">{incomingRequests}</span>}
          </button>
        </div>
      </header>
      
      {view === 'friends' ? (
        <div className="p-4"><FriendsPanel relations={relations} userId={user.id} invoke={invoke} onChat={openChat} isOnline={isOnline} getRoomId={getRoomId} rooms={rooms} /></div>
      ) : (
        <>
          {!isModerator(user) && (
            <button onClick={startAdminChat} disabled={adminLoading} className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border-b border-white/5 text-left active:bg-[#2a2a2a]">
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#5D1D1D' }}><Shield className="w-4 h-4 text-white" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Admin'e Mesaj Gönder</p>
                <p className="text-xs text-[#808080]">Arkadaş eklemeden yöneticiye yazın</p>
              </div>
            </button>
          )}
          {conversations.length > 0 ? (
            <ConversationList conversations={conversations} userId={user.id} onOpen={openConversation} onHide={hide} isOnline={isOnline} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="relative w-20 h-20 rounded-full bg-[#1f1f1f] flex items-center justify-center mb-5">
                <MessageCircle className="w-10 h-10 text-[#333]" />
                <div className="flex gap-1 absolute">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#444]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#444]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#444]" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#BC3838] flex items-center justify-center text-[10px] font-bold text-white">!</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Henüz sohbetin yok</h2>
              <p className="text-sm text-[#808080] mb-6 max-w-xs">Mesajlaşmak için arkadaşlarınla sohbet başlatabilirsin.</p>
              <button onClick={() => switchView('friends')} className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white" style={{ background: '#7F2424' }}>
                <UserPlus className="w-4 h-4" /> Arkadaşlarını Davet Et
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}