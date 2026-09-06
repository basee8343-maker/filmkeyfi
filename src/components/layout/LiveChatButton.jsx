import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Send, X, Search, Ban, Trash2, ShieldOff, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { upsertNotification } from '@/lib/upsertNotification';

const LOGIN_IMAGE = 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/a38a234ce_generated_image.png';

export default function LiveChatButton() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [badge, setBadge] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [unreadTickets, setUnreadTickets] = useState({});
  const endRef = useRef(null);
  const seenIds = useRef(new Set());

  // Arama state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [acting, setActing] = useState(false);

  // Aksiyon neden modalı
  const [actionModal, setActionModal] = useState(null); // { type: 'ban'|'suspend'|'delete', user }
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const isSearching = query.trim().length > 0;

  // Açık destek talepleri + anlık yeni talep bildirimi
  useEffect(() => {
    base44.entities.SupportTicket.filter({ status: { $ne: 'closed' } }, '-created_date', 50)
      .then((t) => {
        setTickets(t);
        if (t.length && !active) setActive(t[0]);
        t.forEach((tk) => seenIds.current.add(tk.id));
      })
      .catch(() => {});
    const unsub = base44.entities.SupportTicket.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.status !== 'closed') {
        setTickets((p) => [ev.data, ...p.filter((t) => t.id !== ev.data.id)]);
        if (!seenIds.current.has(ev.data.id)) {
          seenIds.current.add(ev.data.id);
          setBadge((b) => b + 1);
          setPulse(true);
          setTimeout(() => setPulse(false), 6000);
        }
      }
      if (ev.type === 'update') setTickets((p) => p.map((t) => t.id === ev.data.id ? { ...t, ...ev.data } : t));
      if (ev.type === 'delete') {
        setTickets((p) => p.filter((t) => t.id !== ev.data.id));
        setUnreadTickets((current) => { const next = { ...current }; delete next[ev.data.id]; return next; });
        setActive((current) => {
          if (current?.id !== ev.data.id) return current;
          setMessages([]);
          setSelectedUser(null);
          return null;
        });
      }
    });
    return unsub;
  }, []);

  // Aktif talep mesajları + diğer talepler için kişi bazlı okunmamış işareti
  useEffect(() => {
    if (!active) return;
    base44.entities.SupportMessage.filter({ ticket_id: active.id }, 'created_date', 100)
      .then((m) => { setMessages(m); setTimeout(() => endRef.current?.scrollIntoView(), 50); })
      .catch(() => {});
    const unsub = base44.entities.SupportMessage.subscribe((ev) => {
      if (ev.type !== 'create') return;
      const incoming = ev.data?.sender === 'user';
      const isVisibleThread = open && ev.data?.ticket_id === active.id && !selectedUser && !isSearching;
      if (ev.data?.ticket_id === active.id) {
        setMessages((p) => p.some((m) => m.id === ev.data.id) ? p : [...p, ev.data]);
        setTimeout(() => endRef.current?.scrollIntoView(), 50);
      }
      if (incoming && !isVisibleThread) {
        setUnreadTickets((current) => ({ ...current, [ev.data.ticket_id]: (current[ev.data.ticket_id] || 0) + 1 }));
        setBadge((count) => count + 1);
        setPulse(true);
        setTimeout(() => setPulse(false), 6000);
      }
    });
    return unsub;
  }, [active?.id, open, selectedUser, isSearching]);

  // Kullanıcı arama — ID (member_id) veya isim
  const doSearch = async (q) => {
    const qt = q.trim();
    if (!qt) { setResults([]); return; }
    setSearching(true);
    try {
      const all = await base44.entities.User.list('-created_date', 500);
      const ql = qt.toLowerCase();
      const matched = all.filter((u) => {
        const mid = String(u.member_id || '').trim();
        return mid.includes(qt) ||
          (u.username || '').toLowerCase().includes(ql) ||
          (u.full_name || '').toLowerCase().includes(ql) ||
          (u.email || '').toLowerCase().includes(ql);
      });
      setResults(matched.slice(0, 20));
    } catch (e) {
      toast({ title: 'Arama başarısız', variant: 'destructive' });
      setResults([]);
    }
    setSearching(false);
  };

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) setBadge(0);
  };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    base44.entities.SupportMessage.create({ ticket_id: active.id, owner_id: active.user_id, user_id: user.id, sender: 'admin', text: text.trim() }).catch(() => {});
    base44.entities.SupportTicket.update(active.id, { status: 'answered' }).catch(() => {});
    setText('');
  };

  // Görüşmedeki tüm mesajları anlık sil (admin + kullanıcı tarafı)
  const clearMessages = async () => {
    if (!active) return;
    if (!confirm('Bu görüşmedeki tüm mesajlar silinsin mi?')) return;
    setActing(true);
    try {
      await base44.entities.SupportMessage.deleteMany({ ticket_id: active.id });
      setMessages([]);
      toast({ title: 'Mesajlar silindi' });
    } catch { toast({ title: 'Silinemedi', variant: 'destructive' }); }
    setActing(false);
  };

  const closeConversation = async () => {
    if (!active || acting) return;
    if (!confirm('Konu kapatılsın ve görüşme iki taraftan tamamen silinsin mi?')) return;
    const closingTicket = active;
    setActing(true);
    try {
      await upsertNotification({
        user_id: closingTicket.user_id,
        title: 'Konuşma kapandı',
        body: closingTicket.subject,
        type: 'support',
        link: '/destek'
      });
      await base44.entities.SupportMessage.deleteMany({ ticket_id: closingTicket.id });
      await base44.entities.SupportTicket.delete(closingTicket.id);
      setTickets((current) => current.filter((ticket) => ticket.id !== closingTicket.id));
      setUnreadTickets((current) => { const next = { ...current }; delete next[closingTicket.id]; return next; });
      setMessages([]);
      setSelectedUser(null);
      setActive(null);
      toast({ title: 'Konu kapandı ve görüşme silindi' });
    } catch {
      toast({ title: 'Görüşme kapatılamadı', variant: 'destructive' });
    }
    setActing(false);
  };

  // Aksiyon neden modalını aç
  const openAction = (type, u) => {
    setActionModal({ type, user: u });
    setReason('');
    setDescription('');
  };

  const closeAction = () => {
    setActionModal(null);
    setReason('');
    setDescription('');
  };

  const confirmAction = async () => {
    if (!actionModal) return;
    const { type, user: u } = actionModal;
    if (type === 'delete' && !confirm(`${u.username || u.email} silinsin mi? Bu işlem geri alınamaz.`)) return;
    setActing(true);
    try {
      if (type === 'ban') {
        await base44.functions.invoke('role-management', { action: 'ban_user', user_id: u.id, reason: reason.trim(), description: description.trim() });
        toast({ title: `${u.username || u.email} engellendi` });
        setSelectedUser((prev) => prev && prev.id === u.id ? { ...prev, is_banned: true, ban_reason: reason.trim(), ban_description: description.trim(), membership_status: 'blocked' } : prev);
      } else if (type === 'suspend') {
        await base44.functions.invoke('role-management', { action: 'suspend_user', user_id: u.id, reason: reason.trim(), description: description.trim() });
        toast({ title: `${u.username || u.email} askıya alındı` });
        setSelectedUser((prev) => prev && prev.id === u.id ? { ...prev, is_suspended: true, suspend_reason: reason.trim(), suspend_description: description.trim(), membership_status: 'suspended' } : prev);
      } else if (type === 'delete') {
        await base44.functions.invoke('role-management', { action: 'delete_user', user_id: u.id });
        toast({ title: 'Kullanıcı silindi' });
        setSelectedUser(null);
        setResults((p) => p.filter((r) => r.id !== u.id));
      }
      closeAction();
    } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
    setActing(false);
  };

  const unban = async (u) => {
    setActing(true);
    try {
      await base44.functions.invoke('role-management', { action: 'unban_user', user_id: u.id });
      toast({ title: 'Engel kaldırıldı' });
      setSelectedUser((prev) => prev && prev.id === u.id ? { ...prev, is_banned: false, ban_reason: '', ban_description: '', membership_status: 'active' } : prev);
    } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
    setActing(false);
  };

  const unsuspend = async (u) => {
    setActing(true);
    try {
      await base44.functions.invoke('role-management', { action: 'unsuspend_user', user_id: u.id });
      toast({ title: 'Askıya alma kaldırıldı' });
      setSelectedUser((prev) => prev && prev.id === u.id ? { ...prev, is_suspended: false, suspend_reason: '', suspend_description: '', membership_status: 'active' } : prev);
    } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
    setActing(false);
  };

  // Aktif talebin kullanıcısını getir
  const [ticketUser, setTicketUser] = useState(null);
  useEffect(() => {
    if (!active?.user_id) { setTicketUser(null); return; }
    base44.entities.User.get(active.user_id).then(setTicketUser).catch(() => setTicketUser(null));
  }, [active?.user_id]);

  return (
    <>
      <button
        onClick={toggle}
        className={`relative w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 transition-all ${pulse ? 'border-red-500 animate-pulse' : 'border-purple-500/40 hover:border-purple-400'}`}
        style={{ boxShadow: pulse ? '0 0 14px rgba(239,68,68,0.6)' : '0 0 8px rgba(124,58,237,0.3)' }}
        title="Canlı Sohbet"
      >
        <img src={LOGIN_IMAGE} alt="Canlı Sohbet" className="w-full h-full object-cover" />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-white animate-[scale-in_.3s_ease-out]">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed top-[calc(4rem+max(env(safe-area-inset-top),1.5rem))] right-3 lg:top-20 z-[70] w-[360px] max-w-[calc(100vw-1.5rem)] bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col" style={{ height: '560px' }}>
          <div className="px-3 py-2.5 border-b border-[#2a2a2a] flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-purple-500/40 shrink-0">
              <img src={LOGIN_IMAGE} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Canlı Sohbet</p>
              <p className="text-[10px] text-green-400">● Çevrimiçi · {tickets.length} açık talep</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-white/10 text-white/60"><X className="w-4 h-4" /></button>
          </div>

          {/* Arama çubuğu */}
          <div className="p-2 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ID veya isim ara..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/30 outline-none min-w-0"
              />
              {query && <button onClick={() => { setQuery(''); setSelectedUser(null); }} className="text-white/30 hover:text-white/60"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sol kolon: sohbet (aktif talep) veya profil detayı */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-[#2a2a2a]">
              {selectedUser ? (
                <UserProfileDetail user={selectedUser} onBack={() => setSelectedUser(null)} openAction={openAction} unban={unban} unsuspend={unsuspend} acting={acting} />
              ) : isSearching ? (
                <div className="flex-1 flex items-center justify-center text-xs text-white/30 px-3 text-center">Sağ taraftan kullanıcı seçin</div>
              ) : active ? (
                <>
                  {/* Üstte profil barı (tıklanabilir) */}
                  <button
                    onClick={() => ticketUser && setSelectedUser(ticketUser)}
                    className="px-3 py-2 border-b border-[#2a2a2a] flex items-center gap-2 hover:bg-white/5 transition-colors text-left"
                  >
                    {ticketUser?.avatar
                      ? <img src={ticketUser.avatar} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">{(active.user_name || '?')[0].toUpperCase()}</div>}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{active.user_name}</p>
                      <p className="text-[10px] text-white/40 truncate">{ticketUser?.member_id ? `#${ticketUser.member_id}` : active.subject}</p>
                    </div>
                    {ticketUser && <span className="text-[10px] text-purple-400 shrink-0">Profili ›</span>}
                  </button>
                  <div className="px-3 py-1.5 border-b border-[#2a2a2a] flex items-center justify-between gap-2">
                    <p className="text-[10px] text-white/40 truncate">{active.subject}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={clearMessages} disabled={acting} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50"><Trash2 className="w-3 h-3" />Temizle</button>
                      <button onClick={closeConversation} disabled={acting} className="rounded bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/25 disabled:opacity-50">Konu Kapandı</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.user_id !== m.owner_id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${m.user_id !== m.owner_id ? 'bg-purple-500 text-white' : 'bg-[#2a2a2a] text-white'}`}>
                          {m.file_url && <img src={m.file_url} alt="" className="rounded max-w-full max-h-32 mb-1" />}
                          {m.text && m.text !== '📷 Fotoğraf' && <p>{m.text}</p>}
                        </div>
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                  <form onSubmit={send} className="p-2 border-t border-[#2a2a2a] flex gap-1.5">
                    <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Cevap yaz..." className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-full px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500 min-w-0" />
                    <button type="submit" className="p-2 rounded-full bg-purple-500 text-white shrink-0"><Send className="w-3.5 h-3.5" /></button>
                  </form>
                </>
              ) : <div className="flex-1 flex items-center justify-center text-xs text-white/30 px-3 text-center">Sağ taraftan bir talep seçin</div>}
            </div>

            {/* Sağ kolon: talep listesi / arama sonuçları */}
            <div className="w-32 shrink-0 overflow-y-auto">
              {isSearching ? (
                searching ? <p className="p-3 text-xs text-white/30 text-center">Aranıyor...</p> :
                results.length === 0 ? <p className="p-3 text-xs text-white/30 text-center">Sonuç yok</p> :
                results.map((u) => (
                  <button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full text-left p-2 border-b border-[#2a2a2a] hover:bg-white/5 ${selectedUser?.id === u.id ? 'bg-purple-500/20' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      {u.avatar ? <img src={u.avatar} className="w-6 h-6 rounded-full shrink-0 object-cover" /> : <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">{(u.username || u.email || '?')[0].toUpperCase()}</div>}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{u.username || u.full_name}</p>
                        <p className="text-[10px] text-white/40 truncate">{u.member_id ? `#${u.member_id}` : u.email}</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                tickets.length === 0 ? <p className="p-3 text-xs text-white/30 text-center">Talep yok</p> :
                tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActive(t);
                      setSelectedUser(null);
                      setBadge((count) => Math.max(0, count - (unreadTickets[t.id] || 0)));
                      setUnreadTickets((current) => { const next = { ...current }; delete next[t.id]; return next; });
                    }}
                    className={`relative w-full text-left p-2 border-b border-[#2a2a2a] hover:bg-white/5 ${active?.id === t.id && !selectedUser ? 'bg-purple-500/20' : ''}`}
                  >
                    <p className="pr-5 text-xs font-semibold text-white truncate">{t.user_name}</p>
                    <p className="pr-5 text-[10px] text-white/40 truncate">{t.subject}</p>
                    {unreadTickets[t.id] > 0 && (
                      <span className="absolute right-2 top-1/2 flex h-4 min-w-4 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {unreadTickets[t.id] > 9 ? '9+' : unreadTickets[t.id]}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Aksiyon neden modalı */}
          {actionModal && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-3 z-10 rounded-2xl">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 w-full max-w-[300px]">
                <div className="flex items-center gap-2 mb-3">
                  {actionModal.type === 'ban' && <Ban className="w-4 h-4 text-red-400" />}
                  {actionModal.type === 'suspend' && <ShieldOff className="w-4 h-4 text-amber-400" />}
                  {actionModal.type === 'delete' && <Trash2 className="w-4 h-4 text-red-400" />}
                  <p className="text-sm font-bold text-white">
                    {actionModal.type === 'ban' ? 'Engelle' : actionModal.type === 'suspend' ? 'Askıya Al' : 'Kullanıcıyı Sil'}
                  </p>
                  <button onClick={closeAction} className="ml-auto text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-[11px] text-white/50 mb-3">{actionModal.user.username || actionModal.user.email} — {actionModal.type === 'delete' ? 'Bu işlem geri alınamaz.' : 'Kullanıcı giriş yaparken bu nedeni görecek.'}</p>
                <label className="text-[10px] text-white/40 font-semibold">Neden (kısa)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={100} placeholder="Örn: Kurallara uymama" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500 mb-2" />
                <label className="text-[10px] text-white/40 font-semibold">Açıklama (detaylı)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="Detaylı açıklama..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500 resize-none mb-3" />
                <div className="flex gap-2">
                  <button onClick={closeAction} disabled={acting} className="flex-1 text-xs bg-[#2a2a2a] text-white/70 py-2 rounded-lg font-semibold disabled:opacity-50">İptal</button>
                  <button
                    onClick={confirmAction}
                    disabled={acting}
                    className={`flex-1 text-xs py-2 rounded-lg font-semibold text-white disabled:opacity-50 ${actionModal.type === 'suspend' ? 'bg-amber-500' : 'bg-red-500'}`}
                  >
                    {acting ? 'İşleniyor...' : actionModal.type === 'ban' ? 'Engelle' : actionModal.type === 'suspend' ? 'Askıya Al' : 'Sil'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes scale-in { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
    </>
  );
}

function UserProfileDetail({ user, onBack, openAction, unban, unsuspend, acting }) {
  const isBanned = user.is_banned;
  const isSuspended = user.is_suspended || user.membership_status === 'suspended';
  const isActive = !isBanned && !isSuspended;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center gap-2">
        <button onClick={onBack} className="text-white/40 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
        <p className="text-xs font-bold text-white">Kullanıcı Profili</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center gap-2.5 mb-3">
          {user.avatar ? <img src={user.avatar} className="w-12 h-12 rounded-full shrink-0 object-cover" /> : <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold text-white shrink-0">{(user.username || user.email || '?')[0].toUpperCase()}</div>}
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{user.username || user.full_name}</p>
            <p className="text-[10px] text-white/40 truncate">{user.email}</p>
            <p className="text-[10px] text-purple-400">Üye No: {user.member_id || '-'}</p>
          </div>
        </div>
        <div className="space-y-1.5 text-[11px] text-white/50 mb-3">
          <div className="flex justify-between"><span>Durum:</span><span className={isActive ? 'text-green-400' : 'text-red-400'}>{isBanned ? '🚫 Engelli' : isSuspended ? '⏸️ Askıda' : '✅ Aktif'}</span></div>
          <div className="flex justify-between"><span>Rol:</span><span className="text-white/70">{user.role || 'user'}</span></div>
          <div className="flex justify-between"><span>Kayıt:</span><span className="text-white/70">{fmtDate(user.created_date)}</span></div>
          <div className="flex justify-between"><span>Üyelik Bitiş:</span><span className="text-white/70">{fmtDate(user.membership_end)}</span></div>
          {user.last_login && <div className="flex justify-between"><span>Son Giriş:</span><span className="text-white/70">{fmtDate(user.last_login)}</span></div>}
        </div>
        {(isBanned || isSuspended) && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-3">
            {isBanned && user.ban_reason && <p className="text-[10px] text-red-400"><span className="font-semibold">Engel nedeni:</span> {user.ban_reason}</p>}
            {isSuspended && user.suspend_reason && <p className="text-[10px] text-amber-400"><span className="font-semibold">Askıya alma nedeni:</span> {user.suspend_reason}</p>}
          </div>
        )}
      </div>
      <div className="p-2 border-t border-[#2a2a2a] space-y-1.5">
        {isBanned ? (
          <button onClick={() => unban(user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-green-500/20 text-green-400 py-2 rounded-lg font-semibold disabled:opacity-50"><ShieldCheck className="w-3.5 h-3.5" />Engeli Kaldır</button>
        ) : isSuspended ? (
          <button onClick={() => unsuspend(user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-green-500/20 text-green-400 py-2 rounded-lg font-semibold disabled:opacity-50"><ShieldCheck className="w-3.5 h-3.5" />Aktif Et</button>
        ) : (
          <button onClick={() => openAction('suspend', user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-amber-500/20 text-amber-400 py-2 rounded-lg font-semibold disabled:opacity-50"><ShieldOff className="w-3.5 h-3.5" />Askıya Al</button>
        )}
        {!isBanned && <button onClick={() => openAction('ban', user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-red-500/20 text-red-400 py-2 rounded-lg font-semibold disabled:opacity-50"><Ban className="w-3.5 h-3.5" />Engelle</button>}
        <button onClick={() => openAction('delete', user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-red-500/20 text-red-400 py-2 rounded-lg font-semibold disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" />Kullanıcıyı Sil</button>
      </div>
    </div>
  );
}