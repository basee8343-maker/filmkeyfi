import { useEffect, useState } from 'react';
import { MessageCircle, UsersRound, Bell, Shield, UserPlus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ConversationList from '@/components/friends/ConversationList';
import FriendsPanel from '@/components/friends/FriendsPanel';
import ChatPanel from '@/components/friends/ChatPanel';
import useFriends from '@/hooks/useFriends';
import useFriendPresence from '@/hooks/useFriendPresence';
import { useToast } from '@/components/ui/use-toast';
import { isModerator } from '@/lib/roles';

export default function Friends() {
  const { user, relations, messages, loading, invoke, reload, optimisticHide } = useFriends();
  const { isOnline, getRoomId } = useFriendPresence(user);
  const { toast } = useToast();
  const [adminLoading, setAdminLoading] = useState(false);
  const startAdminChat = async () => {
    setAdminLoading(true);
    try {
      const res = await base44.functions.invoke('friend-service', { action: 'start_admin_chat' });
      if (res?.data?.friendship) { setSelected(res.data.friendship); setView('chat'); reload(); }
    } catch (e) {
      toast({ title: 'Başlatılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setAdminLoading(false); }
  };
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
  useEffect(() => {
    if (view !== 'chat' || !selected) return;
    const current = relations.find((relation) => relation.id === selected.id);
    if (current && current.status !== 'accepted') { setSelected(null); setView('chats'); }
  }, [view, selected?.id, relations]);
  useEffect(() => {
    const chatId = params.get('chat');
    const relation = chatId && relations.find((item) => item.id === chatId && item.status === 'accepted');
    if (relation) { setSelected(relation); setView('chat'); }
  }, [relations, params]);
  if (loading || !user) return <div className="p-6 text-[#808080]">Yükleniyor...</div>;
  const incomingRequests = relations.filter((relation) => relation.status === 'pending' && relation.recipient_id === user.id).length;
  const unreadMessagesList = messages.filter((message) => message.recipient_id === user.id && !(message.read_by || []).includes(user.id)).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const unreadMessages = unreadMessagesList.length;
  const latestUnread = unreadMessagesList[0];
  const latestUnreadRelation = latestUnread && relations.find((r) => r.id === latestUnread.friendship_id && r.status === 'accepted' && !(r.hidden_for || []).includes(user.id));
  const switchView = (next) => { setView(next); setSelected(null); setParams(next === 'chats' ? { view: 'chats' } : {}); };
  const openChat = (relation) => { setSelected(relation); setView('chat'); };
  const hide = (relation) => {
    optimisticHide(relation.id);
    if (selected?.id === relation.id) setSelected(null);
    Promise.all([
      invoke({ action: 'clear_chat', friendship_id: relation.id }),
      invoke({ action: 'hide', friendship_id: relation.id })
    ]).catch(() => reload());
  };
  
  if (view === 'chat') {
    const current = relations.find((relation) => relation.id === selected?.id) || selected;
    const friendId = current?.requester_id === user.id ? current?.recipient_id : current?.requester_id;
    return <div className="max-w-3xl mx-auto sm:p-4"><ChatPanel key={current?.id} friendship={current} userId={user.id} invoke={invoke} onBack={() => switchView('chats')} online={isOnline(friendId)} /></div>;
  }
  
  const acceptedRelations = relations.filter((r) => r.status === 'accepted' && !(r.hidden_for || []).includes(user.id) && !r.is_admin_chat);
  const hasConversations = acceptedRelations.length > 0;
  
  return (
    <div className="max-w-3xl mx-auto min-h-[calc(100vh-8rem)] bg-black text-white">
      <header className="px-4 py-5">
        <h1 className="text-2xl font-extrabold">Arkadaşlar</h1>
        <p className="text-sm text-[#808080] mt-1">Sohbet ve arkadaşlarını yönet.</p>
        <div className="mt-4 flex gap-2 p-1 rounded-xl bg-[#1a1a1a]">
          <button onClick={() => switchView('chats')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'chats' ? 'text-white' : 'text-[#808080]'}`} style={view === 'chats' ? { background: '#5D1D1D' } : {}}>
            <MessageCircle className="w-4 h-4" /> Mesajlar
            {unreadMessages > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-[#D93F3F] text-white text-[10px] flex items-center justify-center">{unreadMessages}</span>}
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
          {latestUnreadRelation && (
            <button onClick={() => openChat(latestUnreadRelation)} className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border-b border-white/5 text-left active:bg-[#2a2a2a]">
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#5D1D1D' }}><Bell className="w-4 h-4 text-white" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{latestUnread.sender_name} size mesaj gönderdi</p>
                <p className="text-xs text-[#808080] truncate">{latestUnread.text}</p>
              </div>
              <span className="text-[10px] font-bold text-[#D93F3F] shrink-0">okunmadı</span>
            </button>
          )}
          {hasConversations ? (
            <ConversationList relations={relations} messages={messages} userId={user.id} onOpen={openChat} onHide={hide} isOnline={isOnline} />
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