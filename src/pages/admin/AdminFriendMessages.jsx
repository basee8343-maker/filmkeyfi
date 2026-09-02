import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AdminFriendThread from '@/components/admin/AdminFriendThread';
import { useToast } from '@/components/ui/use-toast';
import useMessageProfiles from '@/hooks/useMessageProfiles';
import UserBadge from '@/components/admin/UserBadge';

export default function AdminFriendMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const { toast } = useToast();
  const profiles = useMessageProfiles(messages.flatMap((message) => [message.sender_id, message.recipient_id]));
  const load = () => base44.entities.DirectMessage.list('-created_date', 500).then((items) => { setMessages(items); setLoading(false); });
  useEffect(() => { load(); const off = base44.entities.DirectMessage.subscribe(load); return off; }, []);
  const threads = useMemo(() => {
    const grouped = {};
    messages.forEach((message) => {
      if (!grouped[message.friendship_id]) grouped[message.friendship_id] = { id: message.friendship_id, messages: [] };
      grouped[message.friendship_id].messages.push(message);
    });
    return Object.values(grouped).map((thread) => ({ ...thread, messages: thread.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)) })).sort((a, b) => new Date(b.messages.at(-1)?.created_date) - new Date(a.messages.at(-1)?.created_date));
  }, [messages]);
  const clearAll = async () => {
    await base44.functions.invoke('friend-service', { action: 'admin_clear_all' });
    setMessages([]); setActive(null); setConfirmAll(false);
    toast({ title: 'Tüm arkadaş mesajları silindi' });
  };
  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;
  const selected = active && threads.find((thread) => thread.id === active);
  if (selected) return <AdminFriendThread thread={selected} profiles={profiles} onBack={() => setActive(null)} />;
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Arkadaş Mesajları</h1><p className="text-sm text-muted-foreground">Konuşmalar kişilere göre ayrı panellerde gösterilir.</p></div>
        {messages.length > 0 && <button onClick={() => setConfirmAll(true)} className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">BÜTÜNÜ SİL</button>}
      </div>
      {!threads.length ? <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Henüz arkadaş mesajı yok.</div> : <div className="grid gap-3 sm:grid-cols-2">{threads.map((thread) => { const first = thread.messages[0]; const last = thread.messages.at(-1); return <article key={thread.id} className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-center gap-2"><UserBadge userId={first.sender_id} name={first.sender_name || first.sender_id} avatar={profiles[first.sender_id]?.avatar} memberId={profiles[first.sender_id]?.member_id} size="sm" showCopy={false} /><span className="text-muted-foreground">—</span><UserBadge userId={first.recipient_id} name={first.recipient_name || first.recipient_id} avatar={profiles[first.recipient_id]?.avatar} memberId={profiles[first.recipient_id]?.member_id} size="sm" showCopy={false} /></div><p className="mt-2 truncate text-sm text-muted-foreground">{last.text}</p><div className="mt-3 flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{thread.messages.length} mesaj</p><button onClick={() => setActive(thread.id)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">MESAJLARI AÇ</button></div></article>; })}</div>}
      <ConfirmDialog open={confirmAll} onOpenChange={setConfirmAll} title="Tüm arkadaş mesajları silinsin mi?" description="Bütün özel mesaj kayıtları kalıcı olarak silinecek." confirmText="Bütününü Sil" onConfirm={clearAll} />
    </div>
  );
}