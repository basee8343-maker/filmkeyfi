import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Ban, Send, Settings } from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function ChatPanel({ friendship, messages, userId, invoke, onBack, online }) {
  const [text, setText] = useState(''); const [sending, setSending] = useState(false); const [menuOpen, setMenuOpen] = useState(false); const [blocking, setBlocking] = useState(false);
  const [viewport, setViewport] = useState({ height: window.innerHeight, top: 0 });
  const [, setTypingClock] = useState(0);
  const messagesRef = useRef(null);
  const typingTimer = useRef(null);
  const typingActive = useRef(false);
  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => setViewport({ height: visualViewport?.height || window.innerHeight, top: visualViewport?.offsetTop || 0 });
    updateViewport();
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);
  useEffect(() => { messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight }); }, [messages, viewport.height]);
  useEffect(() => { const timer = setInterval(() => setTypingClock(Date.now()), 1000); return () => { clearInterval(timer); clearTimeout(typingTimer.current); }; }, []);
  if (!friendship) return <section className="bg-card border border-border rounded-xl min-h-80 flex items-center justify-center text-sm text-muted-foreground">Mesajlaşmak için bir arkadaş seçin.</section>;
  const mine = friendship.requester_id === userId; const name = mine ? friendship.recipient_name : friendship.requester_name; const avatar = mine ? friendship.recipient_avatar : friendship.requester_avatar;
  const items = messages.filter((message) => message.friendship_id === friendship.id);
  const send = async (event) => { event.preventDefault(); if (!text.trim()) return; clearTimeout(typingTimer.current); typingActive.current = false; setSending(true); try { await invoke({ action: 'typing', friendship_id: friendship.id, typing: false }); await invoke({ action: 'send', friendship_id: friendship.id, text }); setText(''); } catch {} finally { setSending(false); } };
  const changeText = (value) => { setText(value); if (!typingActive.current && value.trim()) { typingActive.current = true; invoke({ action: 'typing', friendship_id: friendship.id, typing: true }).catch(() => {}); } clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => { typingActive.current = false; invoke({ action: 'typing', friendship_id: friendship.id, typing: false }).catch(() => {}); }, 1200); };
  const friendTyping = friendship.typing_user_id && friendship.typing_user_id !== userId && Date.now() - new Date(friendship.typing_updated_at || 0).getTime() < 3000;
  const block = async () => { setBlocking(true); try { await invoke({ action: 'block', friendship_id: friendship.id }); onBack(); } catch {} finally { setBlocking(false); } };
  return <section style={{ '--chat-height': `${viewport.height}px`, '--chat-top': `${viewport.top}px` }} className="fixed inset-x-0 top-[var(--chat-top)] z-[60] h-[var(--chat-height)] min-h-0 flex flex-col overflow-hidden border-y border-border bg-card pt-[max(env(safe-area-inset-top),1.5rem)] sm:relative sm:inset-auto sm:z-auto sm:h-[72vh] sm:min-h-[72vh] sm:rounded-xl sm:border sm:pt-0">
    <header className="relative h-16 shrink-0 px-3 border-b border-border flex items-center justify-between bg-card/95 backdrop-blur"><button onClick={onBack} className="p-2 rounded-full hover:bg-secondary" aria-label="Geri dön"><ArrowLeft className="w-6 h-6" /></button><div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[60%]">{avatar ? <Image src={avatar} className="w-9 h-9 rounded-full" fittingType="fill" /> : <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{name?.[0]}</div>}<div className="min-w-0"><h2 className="font-bold truncate">{name}</h2><p className={`text-[11px] ${friendTyping || online ? 'text-green-500' : 'text-muted-foreground'}`}>{friendTyping ? 'Yazıyor...' : online ? 'Çevrim içi' : 'Çevrim dışı'}</p></div></div><button onClick={() => setMenuOpen((open) => !open)} className="p-2 rounded-full hover:bg-secondary" aria-label="Sohbet ayarları"><Settings className="w-5 h-5" /></button>
    </header>
    {menuOpen && <div className="absolute z-20 right-3 top-14 w-52 rounded-xl border border-border bg-popover p-2 shadow-xl"><button onClick={block} disabled={blocking} className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"><Ban className="w-4 h-4" />{blocking ? 'Engelleniyor...' : 'Kullanıcıyı Engelle'}</button></div>}
    <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4"><div className="rounded-xl bg-secondary/70 px-4 py-3 text-center text-xs text-muted-foreground">Artık {name} ile arkadaşsınız. Birbirinize özel mesaj gönderebilirsiniz.</div>{!items.length && <p className="text-center text-sm text-muted-foreground py-12">İlk mesajı siz gönderin.</p>}{items.map((message) => { const sent = message.sender_id === userId; return <div key={message.id} className={`flex items-end gap-2 ${sent ? 'justify-end' : 'justify-start'}`}>{!sent && (avatar ? <Image src={avatar} className="w-8 h-8 rounded-full shrink-0" fittingType="fill" /> : <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">{name?.[0]}</div>)}<div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${sent ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-foreground'}`}><p className="whitespace-pre-wrap break-words">{message.text}</p><p className="text-[10px] opacity-60 mt-1 text-right">{new Date(message.created_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p></div></div>; })}</div>
    <form onSubmit={send} className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border flex items-center gap-2 bg-card"><input value={text} onChange={(event) => changeText(event.target.value)} maxLength={2000} placeholder="Mesaj yazın..." className="flex-1 min-w-0 bg-secondary rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><button disabled={sending || !text.trim()} className="w-11 h-11 shrink-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full disabled:opacity-50" aria-label="Mesaj gönder"><Send className="w-5 h-5" /></button></form>
  </section>;
}