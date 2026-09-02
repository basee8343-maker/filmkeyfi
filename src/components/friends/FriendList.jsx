import { MessageCircle } from 'lucide-react';

export default function FriendList({ relations, userId, selected, onSelect }) {
  const friends = relations.filter((r) => r.status === 'accepted');
  return <section className="bg-card border border-border rounded-xl p-4"><h2 className="font-bold mb-3">Arkadaşlarım</h2>
    {!friends.length ? <p className="text-sm text-muted-foreground">Henüz arkadaşınız yok.</p> : <div className="space-y-2">{friends.map((r) => {
      const name = r.requester_id === userId ? r.recipient_name : r.requester_name;
      const memberId = r.requester_id === userId ? r.recipient_member_id : r.requester_member_id;
      return <button key={r.id} onClick={() => onSelect(r)} className={`w-full flex items-center gap-3 rounded-lg p-3 text-left ${selected?.id === r.id ? 'bg-primary/15 border border-primary/40' : 'bg-secondary/60'}`}><div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{name?.[0]?.toUpperCase()}</div><div className="flex-1"><p className="text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{memberId}</p></div><MessageCircle className="w-4 h-4 text-muted-foreground" /></button>;
    })}</div>}
  </section>;
}