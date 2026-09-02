import { useEffect, useState } from 'react';
import { MessageCircle, UsersRound } from 'lucide-react';
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
    if (view !== 'chat' || !selected || !user) return;
    const hasUnread = messages.some((message) => message.friendship_id === selected.id && message.recipient_id === user.id && !(message.read_by || []).includes(user.id));
    if (hasUnread) invoke({ action: 'mark_read', friendship_id: selected.id }).catch(() => {});
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [view, selected?.id, messages, user?.id, reload]);
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
  const unreadMessages = messages.filter((message) => message.recipient_id === user.id && !(message.read_by || []).includes(user.id)).length;
  const switchView = (next) => { setView(next); setSelected(null); setParams(next === 'chats' ? { view: 'chats' } : {}); };
  const openChat = (relation) => { setSelected(relation); setView('chat'); invoke({ action: 'mark_read', friendship_id: relation.id }).catch(() => {}); };
  const hide = async (relation) => { await invoke({ action: 'hide', friendship_id: relation.id }); if (selected?.id === relation.id) setSelected(null); };
  if (view === 'chat') { const current = relations.find((relation) => relation.id === selected?.id) || selected; const clearedAt = new Date(current?.cleared_at?.[user.id] || 0); const visibleMessages = messages.filter((message) => message.friendship_id !== current?.id || new Date(message.created_date) > clearedAt); const friendId = current?.requester_id === user.id ? current?.recipient_id : current?.requester_id; return <div className="max-w-3xl mx-auto sm:p-4"><ChatPanel friendship={current} messages={visibleMessages} userId={user.id} invoke={invoke} onBack={() => switchView('chats')} online={isOnline(friendId)} /></div>; }
  return <div className="max-w-3xl mx-auto min-h-[calc(100vh-8rem)] bg-background"><header className="px-4 py-5 border-b border-border"><h1 className="text-2xl font-extrabold">Arkadaşlar</h1><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => switchView('friends')} className={`relative flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${view === 'friends' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}><UsersRound className="w-5 h-5" /> Arkadaşlarım{incomingRequests > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{incomingRequests}</span>}</button><button onClick={() => switchView('chats')} className={`relative flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${view === 'chats' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}><MessageCircle className="w-5 h-5" /> Mesajlar{unreadMessages > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{unreadMessages}</span>}</button></div></header>
    {view === 'friends' ? <div className="p-4"><FriendsPanel relations={relations} userId={user.id} invoke={invoke} onChat={openChat} isOnline={isOnline} /></div> : <ConversationList relations={relations} messages={messages} userId={user.id} onOpen={openChat} onHide={hide} isOnline={isOnline} />}
  </div>;
}