import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Send, X, Flag, Search, Ban, Trash2, ShieldOff, ShieldCheck, UserCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { statusLabel, STATUS_COLORS } from '@/lib/supportStatus';
import { upsertNotification } from '@/lib/upsertNotification';

export default function AdminQuickWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('support');
  return (
    <>
      <button onClick={() => setOpen((v) => !v)} className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }} title="Hızlı Yönetim">
        {open ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-[370px] max-w-[calc(100vw-2.5rem)] bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col" style={{ height: '520px' }}>
          <div className="flex border-b border-[#2a2a2a]">
            {[{ id: 'support', label: 'Destek', icon: Send }, { id: 'reports', label: 'Şikayetler', icon: Flag }, { id: 'users', label: 'Kullanıcı', icon: UserCircle }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold ${tab === t.id ? 'text-white border-b-2 border-purple-500' : 'text-white/40'}`}><t.icon className="w-4 h-4" />{t.label}</button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {tab === 'support' && <SupportTab />}
            {tab === 'reports' && <ReportsTab />}
            {tab === 'users' && <UsersTab />}
          </div>
        </div>
      )}
    </>
  );
}

function SupportTab() {
  const { user: admin } = useCurrentUser();
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    base44.entities.SupportTicket.filter({ status: { $ne: 'closed' } }, '-created_date', 50).then((t) => { setTickets(t); if (t.length && !active) setActive(t[0]); }).catch(() => {});
    const unsub = base44.entities.SupportTicket.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.status !== 'closed') setTickets((p) => [ev.data, ...p.filter((t) => t.id !== ev.data.id)]);
      if (ev.type === 'update') setTickets((p) => p.map((t) => t.id === ev.data.id ? { ...t, ...ev.data } : t));
      if (ev.type === 'delete') setTickets((p) => p.filter((t) => t.id !== ev.data.id));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!active) return;
    base44.entities.SupportMessage.filter({ ticket_id: active.id }, 'created_date', 100).then((m) => { setMessages(m); setTimeout(() => endRef.current?.scrollIntoView(), 50); }).catch(() => {});
    const unsub = base44.entities.SupportMessage.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.ticket_id === active.id) { setMessages((p) => p.some((m) => m.id === ev.data.id) ? p : [...p, ev.data]); setTimeout(() => endRef.current?.scrollIntoView(), 50); }
    });
    return unsub;
  }, [active?.id]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    base44.entities.SupportMessage.create({ ticket_id: active.id, owner_id: active.user_id, user_id: admin.id, sender: 'admin', text: text.trim() }).catch(() => {});
    base44.entities.SupportTicket.update(active.id, { status: 'answered' }).catch(() => {});
    upsertNotification({ user_id: active.user_id, title: 'Destek mesajınıza cevap verildi', body: active.subject, type: 'support', link: '/destek' });
    setText('');
  };

  return (
    <div className="flex h-full">
      <div className="w-32 shrink-0 border-r border-[#2a2a2a] overflow-y-auto">
        {tickets.length === 0 ? <p className="p-3 text-xs text-white/30 text-center">Talep yok</p> : tickets.map((t) => (
          <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-2 border-b border-[#2a2a2a] ${active?.id === t.id ? 'bg-purple-500/20' : ''}`}>
            <p className="text-xs font-semibold text-white truncate">{t.user_name}</p>
            <p className="text-[10px] text-white/40 truncate">{t.subject}</p>
            <span className={`text-[9px] ${STATUS_COLORS[t.status] || 'text-white/40'}`}>{statusLabel(t.status)}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {active ? <>
          <div className="px-3 py-2 border-b border-[#2a2a2a]"><p className="text-xs font-bold text-white truncate">{active.subject}</p><p className="text-[10px] text-white/40">{active.user_name}</p></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {messages.map((m) => <div key={m.id} className={`flex ${m.user_id !== m.owner_id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${m.user_id !== m.owner_id ? 'bg-purple-500 text-white' : 'bg-[#2a2a2a] text-white'}`}>{m.file_url && <img src={m.file_url} alt="" className="rounded max-w-full max-h-32 mb-1" />}{m.text && m.text !== '📷 Fotoğraf' && <p>{m.text}</p>}</div></div>)}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="p-2 border-t border-[#2a2a2a] flex gap-1.5">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Cevap yaz..." className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-full px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500 min-w-0" />
            <button type="submit" className="p-2 rounded-full bg-purple-500 text-white shrink-0"><Send className="w-3.5 h-3.5" /></button>
          </form>
        </> : <div className="flex-1 flex items-center justify-center text-xs text-white/30">Talep seçin</div>}
      </div>
    </div>
  );
}

function ReportsTab() {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const load = () => base44.entities.Report.filter({ status: 'pending' }, '-created_date', 50).then((r) => setReports(r)).catch(() => {});
    load();
    const unsub = base44.entities.Report.subscribe(load);
    return unsub;
  }, []);

  const resolve = async (id) => { await base44.entities.Report.update(id, { status: 'resolved' }).catch(() => {}); toast({ title: 'Şikayet çözüldü' }); };
  const block = async (uid, name) => { try { await base44.functions.invoke('role-management', { action: 'ban_user', user_id: uid, reason: 'Şikayet üzerinden engellendi' }); toast({ title: `${name} engellendi` }); } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); } };

  return (
    <div className="h-full overflow-y-auto p-2 space-y-2">
      {reports.length === 0 ? <p className="text-center text-xs text-white/30 mt-8">Bekleyen şikayet yok</p> : reports.map((r) => (
        <div key={r.id} className="bg-[#1a1a1a] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1"><Flag className="w-3 h-3 text-red-400" /><span className="text-xs font-semibold text-white truncate">{r.target_name}</span></div>
          <p className="text-[10px] text-white/40 mb-1">Şikayet eden: {r.reporter_name}</p>
          {r.reason && <p className="text-[11px] text-white/60 bg-[#0a0a0a] rounded p-1.5 mb-1.5 line-clamp-2">{r.reason}</p>}
          <div className="flex gap-1.5">
            <button onClick={() => block(r.target_id, r.target_name)} className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded font-semibold"><Ban className="w-3 h-3" />Engelle</button>
            <button onClick={() => resolve(r.id)} className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-semibold"><ShieldCheck className="w-3 h-3" />Çözüldü</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const search = async () => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    setLoading(true);
    try {
      const all = await base44.entities.User.list('-created_date', 500);
      const ql = q.toLowerCase();
      const matched = all.filter((u) => (u.member_id || '').includes(q) || (u.username || '').toLowerCase().includes(ql) || (u.full_name || '').toLowerCase().includes(ql) || (u.email || '').toLowerCase().includes(ql));
      setResults(matched.slice(0, 20));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (selected) setSelected(results.find((u) => u.id === selected.id) || selected); }, [results]);

  const suspend = async (u) => { try { await base44.entities.User.update(u.id, { membership_status: 'blocked' }); toast({ title: `${u.username || u.email} askıya alındı` }); } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); } };
  const activate = async (u) => { try { await base44.entities.User.update(u.id, { membership_status: 'active' }); toast({ title: 'Kullanıcı aktif edildi' }); } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); } };
  const ban = async (u) => { try { await base44.functions.invoke('role-management', { action: 'ban_user', user_id: u.id, reason: 'Admin panelinden engellendi' }); toast({ title: 'Kullanıcı engellendi' }); } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); } };
  const unban = async (u) => { try { await base44.functions.invoke('role-management', { action: 'unban_user', user_id: u.id }); toast({ title: 'Engel kaldırıldı' }); } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); } };
  const del = async (u) => { if (!confirm(`${u.username || u.email} silinsin mi?`)) return; try { await base44.entities.User.delete(u.id); toast({ title: 'Kullanıcı silindi' }); setSelected(null); search(); } catch { toast({ title: 'Silinemedi', variant: 'destructive' }); } };

  if (selected) {
    const isActive = selected.membership_status === 'active';
    return (
      <div className="h-full flex flex-col p-3">
        <button onClick={() => setSelected(null)} className="text-xs text-white/40 mb-2">← Geri</button>
        <div className="flex items-center gap-2.5 mb-3">
          {selected.avatar ? <img src={selected.avatar} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold text-white">{(selected.username || selected.email || '?')[0].toUpperCase()}</div>}
          <div className="min-w-0"><p className="text-sm font-bold text-white truncate">{selected.username || selected.full_name}</p><p className="text-[10px] text-white/40 truncate">{selected.email}</p><p className="text-[10px] text-purple-400">Üye No: {selected.member_id || '-'}</p></div>
        </div>
        <div className="space-y-1 text-[11px] text-white/50 mb-3">
          <p>Durum: <span className={isActive ? 'text-green-400' : 'text-red-400'}>{isActive ? 'Aktif' : selected.membership_status === 'blocked' ? 'Askıda' : selected.membership_status}</span></p>
          <p>Engelli: {selected.is_banned ? '⚠️ Evet' : 'Hayır'}</p>
        </div>
        <div className="mt-auto space-y-1.5">
          {isActive ? <button onClick={() => suspend(selected)} className="w-full flex items-center gap-2 justify-center text-xs bg-amber-500/20 text-amber-400 py-2 rounded-lg font-semibold"><ShieldOff className="w-3.5 h-3.5" />Askıya Al</button> : <button onClick={() => activate(selected)} className="w-full flex items-center gap-2 justify-center text-xs bg-green-500/20 text-green-400 py-2 rounded-lg font-semibold"><ShieldCheck className="w-3.5 h-3.5" />Aktif Et</button>}
          {selected.is_banned ? <button onClick={() => unban(selected)} className="w-full flex items-center gap-2 justify-center text-xs bg-green-500/20 text-green-400 py-2 rounded-lg font-semibold"><ShieldCheck className="w-3.5 h-3.5" />Engeli Kaldır</button> : <button onClick={() => ban(selected)} className="w-full flex items-center gap-2 justify-center text-xs bg-red-500/20 text-red-400 py-2 rounded-lg font-semibold"><Ban className="w-3.5 h-3.5" />Engelle</button>}
          <button onClick={() => del(selected)} className="w-full flex items-center gap-2 justify-center text-xs bg-red-500/20 text-red-400 py-2 rounded-lg font-semibold"><Trash2 className="w-3.5 h-3.5" />Kullanıcıyı Sil</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-2">
      <div className="flex gap-1.5 mb-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Üye No / isim / e-posta" className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500 min-w-0" />
        <button onClick={search} className="p-2 rounded-lg bg-purple-500 text-white shrink-0"><Search className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {loading && <p className="text-center text-xs text-white/30 mt-4">Aranıyor...</p>}
        {!loading && results.length === 0 && query.trim() && <p className="text-center text-xs text-white/30 mt-4">Sonuç yok</p>}
        {!loading && results.map((u) => (
          <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-left">
            {u.avatar ? <img src={u.avatar} className="w-7 h-7 rounded-full shrink-0" /> : <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">{(u.username || u.email || '?')[0].toUpperCase()}</div>}
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-white truncate">{u.username || u.full_name}</p><p className="text-[10px] text-white/40 truncate">{u.member_id ? `#${u.member_id}` : u.email}</p></div>
            {u.is_banned && <Ban className="w-3.5 h-3.5 text-red-400 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}