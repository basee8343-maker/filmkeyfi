import { useEffect, useState } from 'react';
import { UsersRound, X } from 'lucide-react';
import ConversationList from '@/components/friends/ConversationList';
import FriendsPanel from '@/components/friends/FriendsPanel';
import ChatPanel from '@/components/friends/ChatPanel';
import useFriends from '@/hooks/useFriends';
import useFriendPresence from '@/hooks/useFriendPresence';

export default function Friends() {
  const { user, relations, messages, loading, invoke } = useFriends();
  const { isOnline } = useFriendPresence(user);
  const [view, setView] = useState('chats'); const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (view !== 'chat' || !selected || !user) return;
    const hasUnread = messages.some((message) => message.friendship_id === selected.id && message.recipient_id === user.id && Array.isArray(message.read_by) && !message.read_by.includes(user.id));
    if (hasUnread) invoke({ action: 'mark_read', friendship_id: selected.id }).catch(() => {});
  }, [view, selected?.id, messages, user?.id]);
  useEffect(() => {
    if (view !== 'chat' || !selected) return;
    const current = relations.find((relation) => relation.id === selected.id);
    if (current && current.status !== 'accepted') { setSelected(null); setView('chats'); }
  }, [view, selected?.id, relations]);
  if (loading || !user) return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;
  const incomingRequests = relations.filter((relation) => relation.status === 'pending' && relation.recipient_id === user.id).length;
  const openChat = (relation) => { setSelected(relation); setView('chat'); invoke({ action: 'mark_read', friendship_id: relation.id }).catch(() => {}); };
  const hide = async (relation) => { await invoke({ action: 'hide', friendship_id: relation.id }); if (selected?.id === relation.id) setSelected(null); };
  if (view === 'chat') { const current = relations.find((relation) => relation.id === selected?.id) || selected; const clearedAt = new Date(current?.cleared_at?.[user.id] || 0); const visibleMessages = messages.filter((message) => message.friendship_id !== current?.id || new Date(message.created_date) > clearedAt); const friendId = current?.requester_id === user.id ? current?.recipient_id : current?.requester_id; return <div className="max-w-3xl mx-auto sm:p-4"><ChatPanel friendship={current} messages={visibleMessages} userId={user.id} invoke={invoke} onBack={() => setView('chats')} online={isOnline(friendId)} /></div>; }
  return <div className="max-w-3xl mx-auto min-h-[calc(100vh-8rem)] bg-background"><header className="flex items-center px-4 py-5 border-b border-border"><h1 className="text-2xl font-extrabold">{view === 'friends' ? 'Arkadaşlar' : 'Sohbet'}</h1><button onClick={() => setView(view === 'friends' ? 'chats' : 'friends')} className="relative ml-auto w-11 h-11 rounded-full bg-yellow-400 text-black flex items-center justify-center" aria-label="Arkadaşlar">{view === 'friends' ? <X className="w-6 h-6" /> : <UsersRound className="w-6 h-6" />}{view !== 'friends' && incomingRequests > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">{incomingRequests > 99 ? '99+' : incomingRequests}</span>}</button></header>
    {view === 'friends' ? <div className="p-4"><FriendsPanel relations={relations} userId={user.id} invoke={invoke} onChat={openChat} isOnline={isOnline} /></div> : <ConversationList relations={relations} messages={messages} userId={user.id} onOpen={openChat} onHide={hide} isOnline={isOnline} />}
  </div>;
}