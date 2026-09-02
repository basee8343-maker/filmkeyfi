export default function FriendRequests({ relations, userId, invoke }) {
  const incoming = relations.filter((r) => r.status === 'pending' && r.recipient_id === userId);
  const outgoing = relations.filter((r) => r.status === 'pending' && r.requester_id === userId);
  const respond = (id, accept) => invoke({ action: 'respond', friendship_id: id, accept }).catch(() => {});
  if (!incoming.length && !outgoing.length) return null;
  return <section className="bg-card border border-border rounded-xl p-4 space-y-3"><h2 className="font-bold">Arkadaşlık İstekleri</h2>
    {incoming.map((r) => <div key={r.id} className="flex items-center gap-2 bg-secondary/60 rounded-lg p-3"><div className="flex-1"><p className="text-sm font-semibold">{r.requester_name}</p><p className="text-xs text-muted-foreground">{r.requester_member_id}</p></div><button onClick={() => respond(r.id, true)} className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-xs font-semibold">Kabul Et</button><button onClick={() => respond(r.id, false)} className="bg-destructive/20 text-destructive px-3 py-1.5 rounded-lg text-xs font-semibold">Reddet</button></div>)}
    {outgoing.map((r) => <div key={r.id} className="bg-secondary/60 rounded-lg p-3"><p className="text-sm font-semibold">{r.recipient_name}</p><p className="text-xs text-muted-foreground">İstek bekliyor · {r.recipient_member_id}</p></div>)}
  </section>;
}