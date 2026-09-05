import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, MessageCircle, UserMinus, Ban, DoorOpen } from 'lucide-react';
import { Image } from '@/components/ui/image';
import FriendSearch from '@/components/friends/FriendSearch';
import FriendRequests from '@/components/friends/FriendRequests';
import FriendshipLevelBadge from '@/components/friends/FriendshipLevelBadge';
import { useMessageRealtime } from '@/components/messages/MessageRealtimeProvider';

export default function FriendsPanel({ relations, userId, invoke, onChat, isOnline, getRoomId, rooms }) {
  const [menuFor, setMenuFor] = useState(null);
  const navigate = useNavigate();
  const { getProgression } = useMessageRealtime();
  const friends = relations.filter((r) => r.status === 'accepted');
  const action = async (type, relation) => { await invoke({ action: type, friendship_id: relation.id }); setMenuFor(null); };

  const getFriendRoom = (friendId) => {
    const roomId = getRoomId ? getRoomId(friendId) : '';
    if (!roomId) return null;
    const room = rooms?.find((r) => r.id === roomId && r.status === 'active');
    if (!room) return null;
    const isPublic = !room.hidden && !room.password;
    return { room, isPublic };
  };

  return <div className="space-y-4"><FriendSearch invoke={invoke} /><FriendRequests relations={relations} userId={userId} invoke={invoke} /><section className="bg-card border border-border rounded-xl overflow-hidden"><h2 className="font-bold p-4 border-b border-border">Arkadaşlarım</h2>
    {!friends.length ? <p className="p-6 text-sm text-center text-muted-foreground">Henüz arkadaşınız yok.</p> : friends.map((r) => {
      const friendId = r.requester_id === userId ? r.recipient_id : r.requester_id;
      const name = r.requester_id === userId ? r.recipient_name : r.requester_name;
      const avatar = r.requester_id === userId ? r.recipient_avatar : r.requester_avatar;
      const member = r.requester_id === userId ? r.recipient_member_id : r.requester_member_id;
      const online = isOnline(friendId);
      const friendRoom = getFriendRoom(friendId);
      return <div key={r.id} className="border-b last:border-0 border-border p-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/kullanici/${friendId}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className="relative shrink-0">{avatar ? <Image src={avatar} className="w-11 h-11 rounded-full" fittingType="fill" /> : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center font-bold">{name?.[0]}</div>}<span className={`absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-card ${online ? 'bg-green-500' : 'bg-muted-foreground'}`} /></div>
            <div className="flex-1 min-w-0"><p className="font-semibold truncate">{name}</p><p className="text-xs text-muted-foreground truncate">{friendRoom?.isPublic ? <span className="text-red-500 font-semibold">{friendRoom.room.owner_name}'in odasında</span> : online ? <span className="text-green-500">Çevrim içi</span> : 'Çevrim dışı'}{member ? ` · ${member}` : ''}</p></div>
          </button>
          <FriendshipLevelBadge level={getProgression(friendId)?.level || 1} variant="list" />
          <button onClick={() => onChat(r)} className="shrink-0 flex items-center gap-1 bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 text-xs font-semibold"><MessageCircle className="w-3.5 h-3.5" /> Sohbet</button>
          <button onClick={() => setMenuFor(menuFor === r.id ? null : r.id)} className="shrink-0 p-1.5 rounded-full hover:bg-secondary"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        {friendRoom?.isPublic && <button onClick={() => navigate(`/oda/${friendRoom.room.id}`)} className="mt-2 w-full flex items-center justify-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg py-1.5 text-xs font-semibold"><DoorOpen className="w-3.5 h-3.5" /> Katıl</button>}
        {menuFor === r.id && <div className="mt-2 flex gap-2"><button onClick={() => action('unfriend', r)} className="flex-1 flex items-center justify-center gap-1 bg-secondary rounded-lg py-1.5 text-xs font-semibold"><UserMinus className="w-3.5 h-3.5" /> Sil</button><button onClick={() => action('block', r)} className="flex-1 flex items-center justify-center gap-1 bg-destructive/15 text-destructive rounded-lg py-1.5 text-xs font-semibold"><Ban className="w-3.5 h-3.5" /> Engelle</button></div>}
      </div>;
    })}
  </section></div>;
}