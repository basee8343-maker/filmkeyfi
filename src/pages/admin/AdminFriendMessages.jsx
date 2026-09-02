import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function AdminFriendMessages() {
  const [messages, setMessages] = useState([]); const [loading, setLoading] = useState(true);
  const load = () => base44.entities.DirectMessage.list('-created_date', 500).then((items) => { setMessages(items); setLoading(false); });
  useEffect(() => { load(); const off = base44.entities.DirectMessage.subscribe(load); return off; }, []);
  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;
  return <div><h1 className="text-2xl font-extrabold mb-1">Arkadaş Mesajları</h1><p className="text-sm text-muted-foreground mb-5">Kullanıcılar arasındaki özel mesajlar yalnızca görüntülenebilir; bu panelden silinemez.</p>
    {!messages.length ? <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">Henüz arkadaş mesajı yok.</div> : <div className="space-y-2">{messages.map((m) => <article key={m.id} className="bg-card border border-border rounded-xl p-4"><div className="flex flex-wrap items-center gap-2 text-sm"><strong>{m.sender_name || m.sender_id}</strong><span className="text-muted-foreground">→</span><strong>{m.recipient_name || m.recipient_id}</strong><time className="ml-auto text-xs text-muted-foreground">{new Date(m.created_date).toLocaleString('tr-TR')}</time></div><p className="mt-2 text-sm whitespace-pre-wrap break-words">{m.text}</p></article>)}</div>}
  </div>;
}