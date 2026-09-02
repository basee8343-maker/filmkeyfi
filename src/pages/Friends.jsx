import { useEffect, useState } from 'react';
import { MessageCircle, UsersRound, Bell } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ConversationList from '@/components/friends/ConversationList';
import FriendsPanel from '@/components/friends/FriendsPanel';
import ChatPanel from '@/components/friends/ChatPanel';
import useFriends from '@/hooks/useFriends';
import useFriendPresence from '@/hooks/useFriendPresence';

export default function Friends() {
  const { user, relations, messages, loading, invoke, reload } = useFriends();
  const { isOnline } = useFriendPresence(user);
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
  if (loading || !user) return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;
  const incomingRequests = relations.filter((relation) => relation.status === 'pending' && relation.recipient_id === user.id).length;
  const unreadMessagesList = messages.filter((message) => message.recipient_id === user.id && !(message.read_by || []).includes(user.id)).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const unreadMessages = unreadMessagesList.length;
  const latestUnread = unreadMessagesList[0];
  const latestUnreadRelation = latestUnread && relations.find((r) => r.id === latestUnread.friendship_id && r.status === 'accepted' && !(r.hidden_for || []).includes(user.id));
  const switchView = (next) => { setView(next); setSelected(null); setParams(next === 'chats' ? { view: 'chats' } : {}); };
  const openChat = (relation) => { setSelected(relation); setView('chat'); };
  const hide = async (relation) => { await invoke({ action: 'hide', friendship_id: relation.id }); if (selected?.id === relation.id) setSelected(null); };
  if (view === 'chat') { const current = relations.find((relation) => relation.id === selected?.id) || selected; const friendId = current?.requester_id === user.id ? current?.recipient_id : current?.requester_id; return <div className="max-w-3xl mx-auto sm:p-4"><ChatPanel friendship={current} userId={user.id} invoke={invoke} onBack={() => switchView('chats')} online={isOnline(friendId)} /></div>; }
  return <div className="max-w-3xl mx-auto min-h-[calc(100vh-8rem)] bg-background"><header className="px-4 py-5 border-b border-border"><h1 className="text-2xl font-extrabold">Arkadaşlar</h1><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => switchView('friends')} className={`relative flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${view === 'friends' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}><UsersRound className="w-5 h-5" /> Arkadaşlarım{incomingRequests > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{incomingRequests}</span>}</button><button onClick={() => switchView('chats')} className={`relative flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${view === 'chats' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}><MessageCircle className="w-5 h-5" /> Mesajlar{unreadMessages > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{unreadMessages}</span>}</button></div></header>
    {view === 'friends' ? <div className="p-4"><FriendsPanel relations={relations} userId={user.id} invoke={invoke} onChat={openChat} isOnline={isOnline} /></div> : <>{latestUnreadRelation && <button onClick={() => openChat(latestUnreadRelation)} className="w-full flex items-center gap-3 px-4 py-3 bg-primary/10 border-b border-primary/20 text-left active:bg-primary/15"><span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Bell className="w-4 h-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-primary truncate">{latestUnread.sender_name} size mesaj gönderdi</p><p className="text-xs text-muted-foreground truncate">{latestUnread.text}</p></div><span className="text-[10px] font-bold text-primary shrink-0">okunmadı</span></button>}<ConversationList relations={relations} messages={messages} userId={user.id} onOpen={openChat} onHide={hide} isOnline={isOnline} /></>}
  </div>;
}