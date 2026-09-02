import { useState } from 'react';
import { MessageCircle, UsersRound, X } from 'lucide-react';
import useFriends from '@/hooks/useFriends';
import useFriendPresence from '@/hooks/useFriendPresence';
import ConversationList from '@/components/friends/ConversationList';
import ChatPanel from '@/components/friends/ChatPanel';
import FriendsPanel from '@/components/friends/FriendsPanel';

export default function RoomDirectMessages({ onClose }) {
  const { user, relations, messages, loading, invoke } = useFriends();
  const { isOnline } = useFriendPresence(user);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('messages');
  if (loading || !user) return <div className="p-6 text-sm text-muted-foreground">Yükleniyor...</div>;
  if (selected) {
    const current = relations.find((item) => item.id === selected.id) || selected;
    const friendId = current.requester_id === user.id ? current.recipient_id : current.requester_id;
    return <ChatPanel friendship={current} userId={user.id} invoke={invoke} onBack={() => setSelected(null)} online={isOnline(friendId)} />;
  }
  return <section className="flex h-full flex-col bg-card pt-[max(env(safe-area-inset-top),1rem)]"><header className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="font-bold">Arkadaş Sohbetleri</h2><button onClick={onClose} className="p-2" aria-label="Kapat"><X className="w-5 h-5" /></button></header><div className="grid grid-cols-2 gap-2 border-b border-border p-3"><button onClick={() => setTab('messages')} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold ${tab === 'messages' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}><MessageCircle className="w-4 h-4" /> Mesajlar</button><button onClick={() => setTab('friends')} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold ${tab === 'friends' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}><UsersRound className="w-4 h-4" /> Arkadaşlar</button></div><div className="min-h-0 flex-1 overflow-y-auto">{tab === 'messages' ? <ConversationList relations={relations} messages={messages} userId={user.id} onOpen={setSelected} onHide={() => {}} isOnline={isOnline} /> : <div className="p-3"><FriendsPanel relations={relations} userId={user.id} invoke={invoke} onChat={setSelected} isOnline={isOnline} /></div>}</div></section>;
}