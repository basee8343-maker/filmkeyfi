import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminFriendThread({ thread, onBack }) {
  const first = thread.messages[0];
  const users = [
    { id: first.sender_id, name: first.sender_name || first.sender_id },
    { id: first.recipient_id, name: first.recipient_name || first.recipient_id },
  ];
  return <section className="overflow-hidden rounded-2xl border border-border bg-card"><header className="flex items-center gap-3 border-b border-border p-4"><button onClick={onBack} className="rounded-lg p-2 hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></button><div className="flex min-w-0 items-center gap-2">{users.map((person, index) => <span key={person.id} className="flex min-w-0 items-center gap-2">{index > 0 && <span className="text-muted-foreground">—</span>}<Link to={`/kullanici/${person.id}`} className="truncate font-bold text-primary hover:underline">{person.name}</Link></span>)}</div></header><div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">{thread.messages.map((message) => <article key={message.id} className="rounded-xl bg-secondary/60 p-3"><div className="flex items-center gap-2 text-sm"><Link to={`/kullanici/${message.sender_id}`} className="font-bold text-primary hover:underline">{message.sender_name || message.sender_id}</Link><time className="ml-auto text-xs text-muted-foreground">{new Date(message.created_date).toLocaleString('tr-TR')}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.text}</p></article>)}</div></section>;
}