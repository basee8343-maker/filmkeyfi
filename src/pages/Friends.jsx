import { useState } from 'react';
import { UsersRound, X } from 'lucide-react';
import ConversationList from '@/components/friends/ConversationList';
import FriendsPanel from '@/components/friends/FriendsPanel';
import ChatPanel from '@/components/friends/ChatPanel';
import useFriends from '@/hooks/useFriends';

export default function Friends() {
  const { user, relations, messages, loading, invoke } = useFriends();
  const [view, setView] = useState('chats'); const [selected, setSelected] = useState(null);
  if (loading || !user) return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;
  const openChat = (relation) => { setSelected(relation); setView('chat'); };
  const hide = async (relation) => { await invoke({ action: 'hide', friendship_id: relation.id }); if (selected?.id === relation.id) setSelected(null); };
  if (view === 'chat') return <div className="max-w-3xl mx-auto sm:p-4"><ChatPanel friendship={selected} messages={messages} userId={user.id} invoke={invoke} onBack={() => setView('chats')} /></div>;
  return <div className="max-w-3xl mx-auto min-h-[calc(100vh-8rem)] bg-background"><header className="flex items-center px-4 py-5 border-b border-border"><h1 className="text-2xl font-extrabold">{view === 'friends' ? 'Arkadaşlar' : 'Sohbet'}</h1><button onClick={() => setView(view === 'friends' ? 'chats' : 'friends')} className="ml-auto w-11 h-11 rounded-full bg-yellow-400 text-black flex items-center justify-center" aria-label="Arkadaşlar">{view === 'friends' ? <X className="w-6 h-6" /> : <UsersRound className="w-6 h-6" />}</button></header>
    {view === 'friends' ? <div className="p-4"><FriendsPanel relations={relations} userId={user.id} invoke={invoke} onChat={openChat} /></div> : <ConversationList relations={relations} messages={messages} userId={user.id} onOpen={openChat} onHide={hide} />}
  </div>;
}