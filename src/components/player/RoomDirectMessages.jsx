import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import useFriends from '@/hooks/useFriends';
import useFriendPresence from '@/hooks/useFriendPresence';
import ConversationList from '@/components/friends/ConversationList';
import ChatPanel from '@/components/friends/ChatPanel';

export default function RoomDirectMessages({ onClose }) {
  const { user, relations, messages, loading, invoke } = useFriends();
  const { isOnline } = useFriendPresence(user);
  const [selected, setSelected] = useState(null);
  useEffect(() => { if (selected) invoke({ action: 'mark_read', friendship_id: selected.id }).catch(() => {}); }, [selected?.id]);
  if (loading || !user) return <div className="p-6 text-sm text-muted-foreground">Yükleniyor...</div>;
  if (selected) {
    const current = relations.find((item) => item.id === selected.id) || selected;
    const friendId = current.requester_id === user.id ? current.recipient_id : current.requester_id;
    return <ChatPanel friendship={current} messages={messages} userId={user.id} invoke={invoke} onBack={() => setSelected(null)} online={isOnline(friendId)} />;
  }
  return <section className="flex h-full flex-col bg-card pt-[max(env(safe-area-inset-top),1rem)]"><header className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="font-bold">Mesajlar</h2><button onClick={onClose} className="p-2" aria-label="Kapat"><X className="w-5 h-5" /></button></header><div className="min-h-0 flex-1 overflow-y-auto"><ConversationList relations={relations} messages={messages} userId={user.id} onOpen={setSelected} onHide={() => {}} isOnline={isOnline} /></div></section>;
}