import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Send, X, Search, Ban, Trash2, ShieldOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
  const endRef = useRef(null);
  const seenIds = useRef(new Set());

  // Arama state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [acting, setActing] = useState(false);

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
      if (ev.type === 'delete') setTickets((p) => p.filter((t) => t.id !== ev.data.id));
    });
    return unsub;
  }, []);

  // Aktif talep için mesajlar
  useEffect(() => {
    if (!active) return;
    base44.entities.SupportMessage.filter({ ticket_id: active.id }, 'created_date', 100)
      .then((m) => { setMessages(m); setTimeout(() => endRef.current?.scrollIntoView(), 50); })
      .catch(() => {});
    const unsub = base44.entities.SupportMessage.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.ticket_id === active.id) {
        setMessages((p) => p.some((m) => m.id === ev.data.id) ? p : [...p, ev.data]);
        setTimeout(() => endRef.current?.scrollIntoView(), 50);
      }
    });
    return unsub;
  }, [active?.id]);

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

  const ban = async (u) => {
    setActing(true);
    try {
      await base44.functions.invoke('role-management', { action: 'ban_user', user_id: u.id, reason: 'Canlı sohbet üzerinden engellendi' });
      toast({ title: `${u.username || u.email} engellendi` });
      setSelectedUser({ ...u, is_banned: true, membership_status: 'blocked' });
    } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
    setActing(false);
  };

  const unban = async (u) => {
    setActing(true);
    try {
      await base44.functions.invoke('role-management', { action: 'unban_user', user_id: u.id });
      toast({ title: 'Engel kaldırıldı' });
      setSelectedUser({ ...u, is_banned: false, membership_status: 'active' });
    } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
    setActing(false);
  };

  const suspend = async (u) => {
    setActing(true);
    try {
      await base44.entities.User.update(u.id, { is_suspended: true, membership_status: 'suspended', active_session_id: '' });
      toast({ title: `${u.username || u.email} askıya alındı` });
      setSelectedUser({ ...u, is_suspended: true, membership_status: 'suspended' });
    } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
    setActing(false);
  };

  const activate = async (u) => {
    setActing(true);
    try {
      await base44.entities.User.update(u.id, { is_suspended: false, membership_status: 'active' });
      toast({ title: 'Kullanıcı aktif edildi' });
      setSelectedUser({ ...u, is_suspended: false, membership_status: 'active' });
    } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
    setActing(false);
  };

  const del = async (u) => {
    if (!confirm(`${u.username || u.email} silinsin mi?`)) return;
    setActing(true);
    try {
      await base44.entities.User.delete(u.id);
      toast({ title: 'Kullanıcı silindi' });
      setSelectedUser(null);
      setResults((p) => p.filter((r) => r.id !== u.id));
    } catch { toast({ title: 'Silinemedi', variant: 'destructive' }); }
    setActing(false);
  };

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
        <div className="fixed top-[calc(4rem+max(env(safe-area-inset-top),1.5rem))] right-3 lg:top-20 z-[70] w-[360px] max-w-[calc(100vw-1.5rem)] bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col" style={{ height: '520px' }}>
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

          <div className="flex h-full min-h-0">
            {/* Sol kolon: arama yoksa talepler, arama varsa kullanıcı sonuçları */}
            <div className="w-32 shrink-0 border-r border-[#2a2a2a] overflow-y-auto">
              {isSearching ? (
                searching ? <p className="p-3 text-xs text-white/30 text-center">Aranıyor...</p> :
                results.length === 0 ? <p className="p-3 text-xs text-white/30 text-center">Sonuç yok</p> :
                results.map((u) => (
                  <button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full text-left p-2 border-b border-[#2a2a2a] ${selectedUser?.id === u.id ? 'bg-purple-500/20' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      {u.avatar ? <img src={u.avatar} className="w-5 h-5 rounded-full shrink-0" /> : <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[8px] font-bold text-white shrink-0">{(u.username || u.email || '?')[0].toUpperCase()}</div>}
                      <p className="text-xs font-semibold text-white truncate">{u.username || u.full_name}</p>
                    </div>
                    <p className="text-[10px] text-white/40 truncate ml-6">{u.member_id ? `#${u.member_id}` : u.email}</p>
                  </button>
                ))
              ) : (
                tickets.length === 0 ? <p className="p-3 text-xs text-white/30 text-center">Talep yok</p> :
                tickets.map((t) => (
                  <button key={t.id} onClick={() => { setActive(t); setSelectedUser(null); }} className={`w-full text-left p-2 border-b border-[#2a2a2a] ${active?.id === t.id && !selectedUser ? 'bg-purple-500/20' : ''}`}>
                    <p className="text-xs font-semibold text-white truncate">{t.user_name}</p>
                    <p className="text-[10px] text-white/40 truncate">{t.subject}</p>
                  </button>
                ))
              )}
            </div>

            {/* Sağ kolon: kullanıcı seçiliyse profil+aksiyonlar, değilse sohbet */}
            <div className="flex-1 flex flex-col min-w-0">
              {selectedUser ? (
                <UserProfilePanel user={selectedUser} onBack={() => setSelectedUser(null)} ban={ban} unban={unban} suspend={suspend} activate={activate} del={del} acting={acting} />
              ) : isSearching ? (
                <div className="flex-1 flex items-center justify-center text-xs text-white/30 px-3 text-center">Sol taraftan kullanıcı seçin</div>
              ) : active ? (
                <>
                  <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center justify-between gap-2">
                    <div className="min-w-0"><p className="text-xs font-bold text-white truncate">{active.subject}</p><p className="text-[10px] text-white/40">{active.user_name}</p></div>
                    <button onClick={clearMessages} disabled={acting} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 shrink-0 disabled:opacity-50"><Trash2 className="w-3 h-3" />Temizle</button>
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
              ) : <div className="flex-1 flex items-center justify-center text-xs text-white/30 px-3 text-center">Sol taraftan bir talep seçin</div>}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes scale-in { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
    </>
  );
}

function UserProfilePanel({ user, onBack, ban, unban, suspend, activate, del, acting }) {
  const isBanned = user.is_banned;
  const isSuspended = user.is_suspended || user.membership_status === 'suspended';
  const isActive = !isBanned && !isSuspended;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center gap-2">
        <button onClick={onBack} className="text-white/40 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
        <p className="text-xs font-bold text-white">Kullanıcı Profili</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center gap-2.5 mb-3">
          {user.avatar ? <img src={user.avatar} className="w-12 h-12 rounded-full shrink-0" /> : <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold text-white shrink-0">{(user.username || user.email || '?')[0].toUpperCase()}</div>}
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{user.username || user.full_name}</p>
            <p className="text-[10px] text-white/40 truncate">{user.email}</p>
            <p className="text-[10px] text-purple-400">Üye No: {user.member_id || '-'}</p>
          </div>
        </div>
        <div className="space-y-1 text-[11px] text-white/50 mb-3">
          <p>Durum: <span className={isActive ? 'text-green-400' : 'text-red-400'}>{isBanned ? '🚫 Engelli' : isSuspended ? '⏸️ Askıda' : '✅ Aktif'}</span></p>
          <p>Rol: {user.role || 'user'}</p>
          {user.created_date && <p>Kayıt: {new Date(user.created_date).toLocaleDateString('tr-TR')}</p>}
        </div>
      </div>
      <div className="p-2 border-t border-[#2a2a2a] space-y-1.5">
        {isBanned ? (
          <button onClick={() => unban(user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-green-500/20 text-green-400 py-2 rounded-lg font-semibold disabled:opacity-50"><ShieldCheck className="w-3.5 h-3.5" />Engeli Kaldır</button>
        ) : isSuspended ? (
          <button onClick={() => activate(user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-green-500/20 text-green-400 py-2 rounded-lg font-semibold disabled:opacity-50"><ShieldCheck className="w-3.5 h-3.5" />Aktif Et</button>
        ) : (
          <button onClick={() => suspend(user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-amber-500/20 text-amber-400 py-2 rounded-lg font-semibold disabled:opacity-50"><ShieldOff className="w-3.5 h-3.5" />Askıya Al</button>
        )}
        {!isBanned && <button onClick={() => ban(user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-red-500/20 text-red-400 py-2 rounded-lg font-semibold disabled:opacity-50"><Ban className="w-3.5 h-3.5" />Engelle</button>}
        <button onClick={() => del(user)} disabled={acting} className="w-full flex items-center gap-2 justify-center text-xs bg-red-500/20 text-red-400 py-2 rounded-lg font-semibold disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" />Kullanıcıyı Sil</button>
      </div>
    </div>
  );
}