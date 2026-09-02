import { useRef, useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function ConversationList({ relations, messages, userId, onOpen, onHide }) {
  const [swiped, setSwiped] = useState(null); const startX = useRef(0);
  const chats = relations.filter((r) => r.status === 'accepted' && !(r.hidden_for || []).includes(userId)).map((r) => ({ relation: r, latest: messages.filter((m) => m.friendship_id === r.id).at(-1) })).sort((a, b) => new Date(b.latest?.created_date || b.relation.updated_date) - new Date(a.latest?.created_date || a.relation.updated_date));
  if (!chats.length) return <p className="py-16 text-center text-sm text-muted-foreground">Henüz sohbetiniz yok.</p>;
  return <div>{chats.map(({ relation, latest }) => {
    const mine = relation.requester_id === userId; const name = mine ? relation.recipient_name : relation.requester_name; const avatar = mine ? relation.recipient_avatar : relation.requester_avatar;
    return <div key={relation.id} className="relative overflow-hidden border-b border-border"><button onClick={() => onHide(relation)} className="absolute inset-y-0 right-0 w-20 bg-destructive text-destructive-foreground flex flex-col items-center justify-center text-xs font-semibold"><Trash2 className="w-5 h-5 mb-1" /> Sil</button><button onTouchStart={(e) => { startX.current = e.touches[0].clientX; }} onTouchEnd={(e) => setSwiped(startX.current - e.changedTouches[0].clientX > 55 ? relation.id : null)} onClick={() => swiped === relation.id ? setSwiped(null) : onOpen(relation)} className={`relative z-10 w-full flex items-center gap-3 bg-background px-4 py-4 text-left transition-transform ${swiped === relation.id ? '-translate-x-20' : 'translate-x-0'}`}>
      <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary shrink-0">{avatar ? <Image src={avatar} alt={name} className="w-full h-full" /> : <span className="w-full h-full flex items-center justify-center text-xl font-bold">{name?.[0]}</span>}</div><div className="min-w-0 flex-1"><p className="font-semibold truncate">{name}</p><p className="text-sm text-muted-foreground truncate">{latest?.text || 'Artık arkadaşsınız. Sohbeti başlatın.'}</p></div><div className="text-right shrink-0"><p className="text-xs text-muted-foreground">{latest ? new Date(latest.created_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</p><ChevronRight className="w-4 h-4 ml-auto mt-2 text-muted-foreground" /></div>
    </button></div>;
  })}</div>;
}