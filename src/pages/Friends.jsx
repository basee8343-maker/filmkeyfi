import { useState } from 'react';
import FriendSearch from '@/components/friends/FriendSearch';
import FriendRequests from '@/components/friends/FriendRequests';
import FriendList from '@/components/friends/FriendList';
import ChatPanel from '@/components/friends/ChatPanel';
import useFriends from '@/hooks/useFriends';

export default function Friends() {
  const { user, relations, messages, loading, invoke } = useFriends();
  const [selected, setSelected] = useState(null);
  if (loading || !user) return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;
  return <div className="p-4 sm:p-6 max-w-6xl mx-auto"><div className="mb-5"><h1 className="text-2xl font-extrabold">Arkadaşlar ve Mesajlar</h1><p className="text-sm text-muted-foreground mt-1">Üye numarasıyla arkadaş bulun, istek gönderin ve özel mesajlaşın.</p></div>
    <div className="grid lg:grid-cols-[360px_1fr] gap-4"><div className="space-y-4"><FriendSearch invoke={invoke} /><FriendRequests relations={relations} userId={user.id} invoke={invoke} /><FriendList relations={relations} userId={user.id} selected={selected} onSelect={setSelected} /></div><ChatPanel friendship={selected} messages={messages} userId={user.id} invoke={invoke} /></div>
  </div>;
}