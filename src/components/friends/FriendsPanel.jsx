import { useState } from 'react';
import { MessageCircle, UserMinus, Ban } from 'lucide-react';
import FriendSearch from '@/components/friends/FriendSearch';
import FriendRequests from '@/components/friends/FriendRequests';

export default function FriendsPanel({ relations, userId, invoke, onChat }) {
  const [active, setActive] = useState(null); const friends = relations.filter((r) => r.status === 'accepted');
  const action = async (type, relation) => { await invoke({ action: type, friendship_id: relation.id }); setActive(null); };
  return <div className="space-y-4"><FriendSearch invoke={invoke} /><FriendRequests relations={relations} userId={userId} invoke={invoke} /><section className="bg-card border border-border rounded-xl overflow-hidden"><h2 className="font-bold p-4 border-b border-border">Arkadaşlarım</h2>
    {!friends.length ? <p className="p-6 text-sm text-center text-muted-foreground">Henüz arkadaşınız yok.</p> : friends.map((r) => { const name = r.requester_id === userId ? r.recipient_name : r.requester_name; const member = r.requester_id === userId ? r.recipient_member_id : r.requester_member_id; return <div key={r.id} className="border-b last:border-0 border-border"><button onClick={() => setActive(active === r.id ? null : r.id)} className="w-full flex items-center gap-3 p-4 text-left"><div className="w-11 h-11 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold">{name?.[0]}</div><div className="flex-1"><p className="font-semibold">{name}</p><p className="text-xs text-muted-foreground">Üye No: {member}</p></div></button>
      {active === r.id && <div className="grid grid-cols-3 gap-2 px-4 pb-4"><button onClick={() => onChat(r)} className="flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-lg py-2 text-xs font-semibold"><MessageCircle className="w-4 h-4" /> Sohbet Et</button><button onClick={() => action('unfriend', r)} className="flex items-center justify-center gap-1 bg-secondary rounded-lg py-2 text-xs font-semibold"><UserMinus className="w-4 h-4" /> Arkadaşı Sil</button><button onClick={() => action('block', r)} className="flex items-center justify-center gap-1 bg-destructive/15 text-destructive rounded-lg py-2 text-xs font-semibold"><Ban className="w-4 h-4" /> Engelle</button></div>}
    </div>; })}
  </section></div>;
}