import { ShieldOff } from 'lucide-react';
import useFriends from '@/hooks/useFriends';

export default function BlockedUsers() {
  const { user, relations, loading, invoke } = useFriends();
  if (loading || !user) return <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor...</p>;
  const blocked = relations.filter((relation) => relation.status === 'blocked' && (relation.blocked_by || []).includes(user.id));
  if (!blocked.length) return <p className="py-10 text-center text-sm text-muted-foreground">Engellediğiniz üye yok.</p>;
  return <div className="bg-card border border-border rounded-xl overflow-hidden">{blocked.map((relation) => {
    const mine = relation.requester_id === user.id; const name = mine ? relation.recipient_name : relation.requester_name; const memberId = mine ? relation.recipient_member_id : relation.requester_member_id;
    return <div key={relation.id} className="flex items-center gap-3 p-4 border-b last:border-0 border-border"><div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold">{name?.[0]}</div><div className="min-w-0 flex-1"><p className="font-semibold truncate">{name}</p><p className="text-xs text-muted-foreground">Üye No: {memberId}</p></div><button onClick={() => invoke({ action: 'unblock', friendship_id: relation.id }).catch(() => {})} className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold"><ShieldOff className="w-4 h-4" /> Engeli Kaldır</button></div>;
  })}</div>;
}