import { useEffect, useState } from 'react';
import { MessageCircle, UsersRound, Shield, UserPlus, Search, SlidersHorizontal } from 'lucide-react';
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
  const { isOnline, getRoomId, getLastSeen } = useFriendPresence(user);
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
  const [search, setSearch] = useState('');

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
      const adminId = res?.data?.admin_id;
      if (!adminId) { toast({ title: 'Yönetici bulunamadı' }); return; }
      const convoRes = await base44.functions.invoke('dm-service', { action: 'start', target_id: adminId });
      if (convoRes?.data?.conversation) { setSelected(convoRes.data.conversation); setView('chat'); }
    } catch (e) {
      toast({ title: 'Başlatılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setAdminLoading(false); }
  };

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

  const hide = (conversation) => {
    optimisticHide(conversation.id);
    if (selected?.id === conversation.id) { setSelected(null); setView('chats'); }
    base44.functions.invoke('dm-service', { action: 'delete_conversation', conversation_id: conversation.id }).catch(() => {});
  };

  const switchView = (next) => { setView(next); setSelected(null); setParams(next === 'chats' ? { view: 'chats' } : {}); };

  if (friendsLoading || convosLoading || !user) return <div className="p-6 text-gray-400">Yükleniyor...</div>;
  const incomingRequests = relations.filter((r) => r.status === 'pending' && r.recipient_id === user.id).length;
  const totalUnread = conversations.reduce((sum, c) => sum + (c.user1_id === user.id ? (c.unread_user1 || 0) : (c.unread_user2 || 0)), 0);

  if (view === 'chat') {
    const friendId = selected?.user1_id === user.id ? selected?.user2_id : selected?.user1_id;
    return <div className="max-w-3xl mx-auto sm:p-4"><ChatPanel key={selected?.id} conversation={selected} userId={user.id} onBack={() => switchView('chats')} online={isOnline(friendId)} getLastSeen={getLastSeen} /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto min-h-[calc(100vh-8rem)] bg-[#0a0a0f] text-white">
      <header className="px-4 py-5">
        <h1 className="text-2xl font-extrabold">Arkadaşlar</h1>
        <p className="text-sm text-gray-400 mt-1">Sohbet ve arkadaşlarını yönet.</p>
        <div className="mt-4 flex gap-2 p-1 rounded-xl bg-[#16161e]">
          <button onClick={() => switchView('chats')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'chats' ? 'text-white' : 'text-gray-400'}`} style={view === 'chats' ? { background: 'linear-gradient(135deg, #7c3aed, #db2777)' } : {}}>
            <MessageCircle className="w-4 h-4" /> Mesajlar
            {totalUnread > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center">{totalUnread}</span>}
          </button>
          <button onClick={() => switchView('friends')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'friends' ? 'text-white' : 'text-gray-400'}`} style={view === 'friends' ? { background: 'linear-gradient(135deg, #7c3aed, #db2777)' } : {}}>
            <UsersRound className="w-4 h-4" /> Arkadaşlarım
            {incomingRequests > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center">{incomingRequests}</span>}
          </button>
        </div>
      </header>

      {view === 'friends' ? (
        <div className="p-4"><FriendsPanel relations={relations} userId={user.id} invoke={invoke} onChat={openChat} isOnline={isOnline} getRoomId={getRoomId} rooms={rooms} /></div>
      ) : (
        <>
          {!isModerator(user) && (
            <button onClick={startAdminChat} disabled={adminLoading} className="w-full flex items-center gap-3 px-4 py-3 bg-[#16161e] border-b border-white/5 text-left active:bg-[#1c1c24]">
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}><Shield className="w-4 h-4 text-white" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Admin'e Mesaj Gönder</p>
                <p className="text-xs text-gray-400">Arkadaş eklemeden yöneticiye yazın</p>
              </div>
            </button>
          )}
          <div className="px-4 py-3 relative">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kişi ara..." className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#16161e] border border-white/5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500/50" />
            <SlidersHorizontal className="absolute right-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
          {conversations.length > 0 ? (
            <ConversationList conversations={conversations.filter((c) => { const name = c.user1_id === user.id ? c.user2_name : c.user1_name; return !search.trim() || name?.toLowerCase().includes(search.toLowerCase()); })} userId={user.id} onOpen={openConversation} onHide={hide} isOnline={isOnline} getLastSeen={getLastSeen} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="relative w-20 h-20 rounded-full bg-[#16161e] flex items-center justify-center mb-5">
                <MessageCircle className="w-10 h-10 text-purple-500/40" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white">!</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Henüz sohbetin yok</h2>
              <p className="text-sm text-gray-400 mb-6 max-w-xs">Mesajlaşmak için arkadaşlarınla sohbet başlatabilirsin.</p>
              <button onClick={() => switchView('friends')} className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}>
                <UserPlus className="w-4 h-4" /> Arkadaşlarını Davet Et
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}