import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Send, Trash2, XCircle } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import UserBadge from '@/components/admin/UserBadge';
import { statusLabel, STATUS_COLORS } from '@/lib/supportStatus';
import { upsertNotification } from '@/lib/upsertNotification';

export default function AdminSupport() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState(null);
  const endRef = useRef(null);

  const load = () => { base44.entities.SupportTicket.list(200).then(async (t) => {
    setTickets(t); if (!active && t.length) setActive(t[0]);
    const uIds = [...new Set(t.map((tk) => tk.user_id).filter(Boolean))];
    const ps = await Promise.all(uIds.map((id) => base44.functions.invoke('user-profile', { user_id: id }).catch(() => null)));
    setProfiles(Object.fromEntries(uIds.map((id, i) => [id, ps[i]])));
  }).catch(() => {}); };
  useEffect(load, []);
  // Gerçek zamanlı abonelik — polling yok
  useEffect(() => {
    const unsub = base44.entities.SupportTicket.subscribe((ev) => {
      if (ev.type === 'create') {
        setTickets((prev) => [ev.data, ...prev.filter((t) => t.id !== ev.data.id)]);
        setActive((cur) => cur || ev.data);
      }
      if (ev.type === 'update') {
        setTickets((prev) => prev.map((t) => t.id === ev.data.id ? { ...t, ...ev.data } : t));
        setActive((cur) => cur?.id === ev.data.id ? { ...cur, ...ev.data } : cur);
      }
      if (ev.type === 'delete') {
        setTickets((prev) => prev.filter((t) => t.id !== ev.data.id));
        setActive((cur) => cur?.id === ev.data.id ? null : cur);
      }
    });
    return unsub;
  }, []);
  useEffect(() => {
    if (!active) return;
    const fetchMsgs = () => base44.entities.SupportMessage.filter({ ticket_id: active.id }, 'created_date', 200).then((m) => { setMessages(m); setTimeout(() => endRef.current?.scrollIntoView(), 50); }).catch(() => {});
    fetchMsgs();
    const unsub = base44.entities.SupportMessage.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.ticket_id === active.id) { setMessages((p) => p.some((m) => m.id === ev.data.id) ? p : [...p, ev.data]); setTimeout(() => endRef.current?.scrollIntoView(), 50); }
      if (ev.type === 'delete' && ev.data?.ticket_id === active.id) { setMessages((p) => p.filter((m) => m.id !== ev.data.id)); }
    });
    return unsub;
  }, [active?.id]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    base44.entities.SupportMessage.create({ ticket_id: active.id, owner_id: active.user_id, user_id: admin.id, sender: 'admin', text: text.trim() }).catch(() => {});
    base44.entities.SupportTicket.update(active.id, { status: 'answered' }).catch(() => {});
    upsertNotification({ user_id: active.user_id, title: 'Destek mesajınıza cevap verildi', body: active.subject, type: 'support', link: '/destek' });
    setText(''); load();
  };

  const setStatus = async (s) => { await base44.entities.SupportTicket.update(active.id, { status: s }); load(); };

  const closeAndClear = async () => {
    await base44.entities.SupportMessage.deleteMany({ ticket_id: active.id }).catch(() => {});
    await base44.entities.SupportTicket.update(active.id, { status: 'closed' }).catch(() => {});
    await upsertNotification({ user_id: active.user_id, title: 'Destek talebiniz kapatıldı', body: active.subject, type: 'support' });
    setMessages([]); setConfirm(null); load(); toast({ title: 'Sohbet kapatıldı, mesajlar silindi' });
  };

  const delTicket = async () => {
    await base44.entities.SupportMessage.deleteMany({ ticket_id: active.id }).catch(() => {});
    await base44.entities.SupportTicket.delete(active.id).catch(() => {});
    setConfirm(null); setActive(null); setMessages([]); load(); toast({ title: 'Talep silindi' });
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">Destek Mesajları</h1>
      <div className="grid sm:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-180px)] sm:h-[60vh]">
        <div className="overflow-y-auto space-y-2 max-h-[25vh] sm:max-h-none">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-3 rounded-lg border ${active?.id === t.id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
              <p className="font-medium text-sm truncate">{t.subject}</p>
              <p className="text-xs text-muted-foreground">{t.user_name} · {profiles[t.user_id]?.member_id ? `#${profiles[t.user_id].member_id} · ` : ''}<span className={STATUS_COLORS[t.status] || ''}>{statusLabel(t.status)}</span></p>
            </button>
          ))}
        </div>
        <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          {active ? <>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <div className="min-w-0"><p className="font-semibold truncate">{active.subject}</p><div className="mt-1"><UserBadge userId={active.user_id} name={active.user_name} avatar={profiles[active.user_id]?.avatar} memberId={profiles[active.user_id]?.member_id} size="sm" /></div><p className="text-xs text-muted-foreground mt-1">{active.category}</p></div>
              <div className="flex items-center gap-2">
                <select value={active.status} onChange={(e) => setStatus(e.target.value)} className="bg-secondary rounded-lg px-2 py-1 text-xs">
                  <option value="new">Yeni</option><option value="reviewing">İnceleniyor</option><option value="answered">Cevaplandı</option><option value="closed">Kapatıldı</option>
                </select>
                <button onClick={() => setConfirm('close')} className="p-2 rounded-lg bg-amber-500/20 text-amber-400" title="Kapat ve mesajları sil"><XCircle className="w-4 h-4" /></button>
                <button onClick={() => setConfirm('delete')} className="p-2 rounded-lg bg-red-500/20 text-red-400" title="Sil"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m) => <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm overflow-hidden ${m.sender === 'admin' ? 'bg-accent text-accent-foreground' : 'bg-secondary'}`}>{m.file_url && <img src={m.file_url} alt="foto" className="rounded-lg max-w-full max-h-48 object-cover mb-1" />}{m.text && m.text !== '📷 Fotoğraf' && <p>{m.text}</p>}</div></div>)}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="p-3 border-t border-border flex items-center gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Cevap yazın..." className="flex-1 bg-secondary/60 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" className="p-2.5 rounded-full bg-primary text-primary-foreground"><Send className="w-4 h-4" /></button>
            </form>
          </> : <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Talep seçin.</div>}
        </div>
      </div>
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'close' ? 'Sohbeti kapat ve mesajları sil?' : 'Talebi tamamen sil?'}
        description={confirm === 'close' ? 'Kullanıcının mesajları silinecek ve talep kapatılacak.' : 'Talep ve tüm mesajlar kalıcı olarak silinecek.'}
        onConfirm={confirm === 'close' ? closeAndClear : delTicket} />
    </div>
  );
}