import { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';

export default function ChatPanel({ friendship, messages, userId, invoke, onBack }) {
  const [text, setText] = useState(''); const [sending, setSending] = useState(false);
  if (!friendship) return <section className="bg-card border border-border rounded-xl min-h-80 flex items-center justify-center text-sm text-muted-foreground">Mesajlaşmak için bir arkadaş seçin.</section>;
  const name = friendship.requester_id === userId ? friendship.recipient_name : friendship.requester_name;
  const items = messages.filter((m) => m.friendship_id === friendship.id);
  const send = async (e) => { e.preventDefault(); if (!text.trim()) return; setSending(true); try { await invoke({ action: 'send', friendship_id: friendship.id, text }); setText(''); } catch {} finally { setSending(false); } };
  return <section className="bg-card border border-border rounded-xl min-h-[70vh] flex flex-col overflow-hidden"><header className="p-4 border-b border-border flex items-center gap-3"><button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></button><div><h2 className="font-bold">{name}</h2><p className="text-xs text-muted-foreground">Özel mesaj</p></div></header>
    <div className="flex-1 p-4 space-y-2 max-h-[55vh] overflow-y-auto">{!items.length && <p className="text-center text-sm text-muted-foreground py-10">İlk mesajı siz gönderin.</p>}{items.map((m) => <div key={m.id} className={`max-w-[82%] rounded-xl px-3 py-2 text-sm ${m.sender_id === userId ? 'ml-auto bg-primary text-primary-foreground' : 'bg-secondary'}`}><p>{m.text}</p><p className="text-[10px] opacity-60 mt-1">{new Date(m.created_date).toLocaleString('tr-TR')}</p></div>)}</div>
    <form onSubmit={send} className="p-3 border-t border-border flex gap-2"><input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Mesaj yazın..." className="flex-1 min-w-0 bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><button disabled={sending || !text.trim()} className="bg-primary text-primary-foreground rounded-lg px-3 disabled:opacity-50"><Send className="w-4 h-4" /></button></form>
  </section>;
}