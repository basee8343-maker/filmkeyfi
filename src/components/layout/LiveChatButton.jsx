import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Send, X } from 'lucide-react';

const LOGIN_IMAGE = 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/a38a234ce_generated_image.png';

export default function LiveChatButton() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [badge, setBadge] = useState(0);
  const [pulse, setPulse] = useState(false);
  const endRef = useRef(null);
  const seenIds = useRef(new Set());

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
        <div className="fixed top-[calc(4rem+max(env(safe-area-inset-top),1.5rem))] right-3 lg:top-20 z-[70] w-[360px] max-w-[calc(100vw-1.5rem)] bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col" style={{ height: '480px' }}>
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

          <div className="flex h-full">
            <div className="w-28 shrink-0 border-r border-[#2a2a2a] overflow-y-auto">
              {tickets.length === 0 ? <p className="p-3 text-xs text-white/30 text-center">Talep yok</p> : tickets.map((t) => (
                <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-2 border-b border-[#2a2a2a] ${active?.id === t.id ? 'bg-purple-500/20' : ''}`}>
                  <p className="text-xs font-semibold text-white truncate">{t.user_name}</p>
                  <p className="text-[10px] text-white/40 truncate">{t.subject}</p>
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              {active ? <>
                <div className="px-3 py-2 border-b border-[#2a2a2a]"><p className="text-xs font-bold text-white truncate">{active.subject}</p><p className="text-[10px] text-white/40">{active.user_name}</p></div>
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
              </> : <div className="flex-1 flex items-center justify-center text-xs text-white/30 px-3 text-center">Sol taraftan bir talep seçin</div>}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes scale-in { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
    </>
  );
}