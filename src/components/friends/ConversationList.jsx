import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { Image } from '@/components/ui/image';
import FriendshipLevelBadge from '@/components/friends/FriendshipLevelBadge';
import { useMessageRealtime } from '@/components/messages/MessageRealtimeProvider';

export default function ConversationList({ conversations, userId, onOpen, onHide, isOnline }) {
  const [swiped, setSwiped] = useState(null);
  const { getProgression } = useMessageRealtime();
  useEffect(() => { setSwiped(null); }, [conversations]);
  const touchStart = useRef({ x: 0, y: 0 });
  const swipingRef = useRef(false);
  const chats = conversations.map((c) => {
    const mine = c.user1_id === userId;
    const name = mine ? c.user2_name : c.user1_name;
    const avatar = mine ? c.user2_avatar : c.user1_avatar;
    const otherId = mine ? c.user2_id : c.user1_id;
    const unread = mine ? (c.unread_user1 || 0) : (c.unread_user2 || 0);
    return { conversation: c, name, avatar, otherId, unread };
  }).sort((a, b) => new Date(b.conversation.last_message_at || b.conversation.updated_date || 0) - new Date(a.conversation.last_message_at || a.conversation.updated_date || 0));
  if (!chats.length) return <p className="py-16 text-center text-sm text-muted-foreground">Henüz sohbetiniz yok.</p>;
  return <div>{chats.map(({ conversation, name, avatar, otherId, unread }) => {
    // Çevrim dışı mod: arkadaş bu sohbette offline görünüyorsa
    const friendOffline = (conversation.offline_for || []).includes(otherId);
    const online = !friendOffline && isOnline ? isOnline(otherId) : false;
    return <div key={conversation.id} className="relative overflow-hidden border-b border-border">
      {/* Sil butonu — sadece swipe ile görünür */}
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onHide(conversation); }}
        onTouchEnd={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 w-20 bg-destructive text-destructive-foreground flex flex-col items-center justify-center text-xs font-semibold"
      >
        <Trash2 className="w-5 h-5 mb-1" /> Sil
      </button>
      <div
        onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          const distance = touchStart.current.x - e.changedTouches[0].clientX;
          const vertical = Math.abs(touchStart.current.y - e.changedTouches[0].clientY);
          if (distance > 55 && distance > vertical * 1.5) {
            setSwiped(conversation.id);
            swipingRef.current = true;
            setTimeout(() => { swipingRef.current = false; }, 350);
          } else if (distance < -30) {
            setSwiped(null);
          }
        }}
        onClick={() => {
          if (swipingRef.current) return;
          onOpen(conversation);
        }}
        className={`relative z-10 w-full flex items-center gap-3 px-4 py-4 cursor-pointer transition-transform bg-background ${swiped === conversation.id ? '-translate-x-20' : 'translate-x-0'} ${unread > 0 ? 'bg-primary/5' : ''}`}
      >
        <div className="relative w-14 h-14 rounded-full bg-secondary shrink-0"><div className="w-full h-full rounded-full overflow-hidden">{avatar ? <Image src={avatar} alt={name} className="w-full h-full" /> : <span className="w-full h-full flex items-center justify-center text-xl font-bold">{name?.[0]}</span>}</div>{unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">{unread}</span>}<span className={`absolute right-0 bottom-0 w-3.5 h-3.5 rounded-full border-2 border-background ${online ? 'bg-green-500' : 'bg-muted-foreground'}`} /></div><div className="min-w-0 flex-1"><p className={`truncate ${unread > 0 ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>{name}</p><p className="text-xs text-muted-foreground">{online ? 'Çevrim içi' : 'Çevrim dışı'}</p><p className={`text-sm truncate ${unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{unread > 0 ? <span className="text-primary">● </span> : ''}{conversation.last_message_text || 'Sohbeti başlatın.'}</p></div><div className="text-right shrink-0 flex flex-col items-end gap-1"><p className="text-xs text-muted-foreground">{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</p><FriendshipLevelBadge level={getProgression(otherId)?.level || 1} variant="list" /><ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" /></div>
      </div>
    </div>;
  })}</div>;
}