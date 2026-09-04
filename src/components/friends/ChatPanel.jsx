import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Ban, Send, Settings, Trash2, Trash, Flag, X, Image as ImageIcon } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import useDirectMessages from '@/hooks/useDirectMessages';
import ReportDialog from '@/components/ReportDialog';
import RoleMessageEffect from '@/components/role/RoleMessageEffect';

export default function ChatPanel({ friendship, userId, invoke, onBack, online, embedded }) {
  const { messages: allMessages, loading, sending, send: sendMsg, markRead, del, clearAll } = useDirectMessages(friendship?.id);
  const { user: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === 'admin';
  const [friendProfile, setFriendProfile] = useState(null);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [viewport, setViewport] = useState({ height: window.innerHeight, top: 0 });
  const [, setTypingClock] = useState(0);
  const messagesRef = useRef(null);
  const typingTimer = useRef(null);
  const typingActive = useRef(false);
  const touchStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => setViewport({ height: visualViewport?.height || window.innerHeight, top: visualViewport?.offsetTop || 0 });
    updateViewport();
    visualViewport?.addEventListener('resize', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      visualViewport?.removeEventListener('resize', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [allMessages, viewport.height]);

  useEffect(() => {
    const timer = setInterval(() => setTypingClock(Date.now()), 1000);
    return () => { clearInterval(timer); clearTimeout(typingTimer.current); };
  }, []);

  useEffect(() => {
    if (!friendship?.id) return;
    window.dispatchEvent(new CustomEvent('social-thread-open', { detail: { friendshipId: friendship.id } }));
    markRead();
    return () => window.dispatchEvent(new Event('social-thread-close'));
  }, [friendship?.id, markRead]);

  // Fetch friend profile for role-based message effects
  useEffect(() => {
    if (!friendship) return;
    const friendId = mine ? friendship.recipient_id : friendship.requester_id;
    if (!friendId) return;
    let active = true;
    base44.functions.invoke('user-profile', { user_id: friendId })
      .then((res) => { if (active) setFriendProfile(res.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [friendship?.id]);

  if (!friendship) return <section className="bg-card border border-border rounded-xl min-h-80 flex items-center justify-center text-sm text-muted-foreground">Mesajlaşmak için bir arkadaş seçin.</section>;

  const mine = friendship.requester_id === userId;
  const name = mine ? friendship.recipient_name : friendship.requester_name;
  const avatar = mine ? friendship.recipient_avatar : friendship.requester_avatar;
  const items = allMessages;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    clearTimeout(typingTimer.current);
    typingActive.current = false;
    const messageText = text.trim();
    setText('');
    try {
      await sendMsg(messageText);
      invoke({ action: 'typing', friendship_id: friendship.id, typing: false }).catch(() => {});
    } catch {}
  };

  const changeText = (value) => {
    setText(value);
    if (!typingActive.current && value.trim()) {
      typingActive.current = true;
      invoke({ action: 'typing', friendship_id: friendship.id, typing: true }).catch(() => {});
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingActive.current = false;
      invoke({ action: 'typing', friendship_id: friendship.id, typing: false }).catch(() => {});
    }, 1200);
  };

  const friendTyping = friendship.typing_user_id && friendship.typing_user_id !== userId && Date.now() - new Date(friendship.typing_updated_at || 0).getTime() < 3000;
  const block = async () => { setBlocking(true); try { await invoke({ action: 'block', friendship_id: friendship.id }); onBack(); } catch {} finally { setBlocking(false); } };
  const clearChat = async () => { setClearing(true); try { await clearAll(); setMenuOpen(false); } catch {} finally { setClearing(false); } };

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(f.type)) { toast({ title: 'Sadece JPG, PNG, WEBP', variant: 'destructive' }); e.target.value = ''; return; }
    if (f.size > 10 * 1024 * 1024) { toast({ title: 'Maksimum 10 MB', variant: 'destructive' }); e.target.value = ''; return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      await base44.functions.invoke('send-chat-image', { file_url, context: 'dm', context_id: friendship.id, text: '' });
    } catch (err) {
      toast({ title: 'Görsel gönderilemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
    } finally { setUploading(false); e.target.value = ''; }
  };

  return <section style={embedded ? undefined : { '--chat-height': `${viewport.height}px`, '--chat-top': `${viewport.top}px` }} className={embedded ? "relative inset-auto z-auto h-full min-h-0 flex flex-col bg-card" : "fixed inset-x-0 top-[var(--chat-top)] z-[60] h-[var(--chat-height)] min-h-0 flex flex-col overflow-hidden border-y border-border bg-card pt-[max(env(safe-area-inset-top),1.5rem)] sm:relative sm:inset-auto sm:z-auto sm:h-[72vh] sm:min-h-[72vh] sm:rounded-xl sm:border sm:pt-0"} onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchStart.current.x; const dy = e.changedTouches[0].clientY - touchStart.current.y; if (dx > 80 && dx > Math.abs(dy) * 1.5) onBack(); }}>
    <header className="relative h-16 shrink-0 px-3 border-b border-border flex items-center justify-between bg-card/95 backdrop-blur"><button onClick={onBack} className="p-2 rounded-full hover:bg-secondary" aria-label="Geri dön"><ArrowLeft className="w-6 h-6" /></button><div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[60%]">{avatar ? <Image src={avatar} className="w-9 h-9 rounded-full" fittingType="fill" /> : <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{name?.[0]}</div>}<div className="min-w-0"><h2 className="font-bold truncate">{name}</h2><p className={`text-[11px] ${friendTyping || online ? 'text-green-500' : 'text-muted-foreground'}`}>{friendTyping ? 'Yazıyor...' : online ? 'Çevrim içi' : 'Çevrim dışı'}</p></div></div><button onClick={() => setMenuOpen((open) => !open)} className="p-2 rounded-full hover:bg-secondary" aria-label="Sohbet ayarları"><Settings className="w-5 h-5" /></button>
    </header>
    {menuOpen && <div className="absolute z-20 right-3 top-14 w-52 rounded-xl border border-border bg-popover p-2 shadow-xl"><div className="flex items-center justify-between px-1 pb-1 mb-1 border-b border-border"><span className="text-xs font-semibold text-muted-foreground">Sohbet Ayarları</span><button onClick={() => setMenuOpen(false)} className="p-1 rounded hover:bg-secondary" aria-label="Kapat"><X className="w-3.5 h-3.5" /></button></div><button onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"><Flag className="w-4 h-4" />Şikayet Et</button><button onClick={clearChat} disabled={clearing || !allMessages.length} className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"><Trash className="w-4 h-4" />{clearing ? 'Temizleniyor...' : 'Tümünü Sil'}</button><button onClick={block} disabled={blocking} className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"><Ban className="w-4 h-4" />{blocking ? 'Engelleniyor...' : 'Kullanıcıyı Engelle'}</button></div>}
    <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}><div className="rounded-xl bg-secondary/70 px-4 py-3 text-center text-xs text-muted-foreground">Artık {name} ile arkadaşsınız. Birbirinize özel mesaj gönderebilirsiniz.</div>{loading && <p className="text-center text-sm text-muted-foreground py-12">Mesajlar yükleniyor...</p>}{!loading && !items.length && <p className="text-center text-sm text-muted-foreground py-12">İlk mesajı siz gönderin.</p>}{items.map((message) => { const sent = message.sender_id === userId; const senderRoleKey = sent ? (currentUser?.display_role || '') : (friendProfile?.display_role || ''); return <div key={message.id} className={`group flex items-end gap-2 ${sent ? 'justify-end' : 'justify-start'}`}>{!sent && (avatar ? <Image src={avatar} className="w-8 h-8 rounded-full shrink-0" fittingType="fill" /> : <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">{name?.[0]}</div>)}<RoleMessageEffect roleKey={senderRoleKey} className="max-w-[78%]"><div className={`rounded-2xl px-4 py-2.5 text-sm ${sent ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-foreground'}`}>{message.file_url && <Image src={message.file_url} alt="foto" className="rounded-lg max-w-[200px] max-h-56 object-cover mb-1 cursor-pointer" fittingType="fit" onClick={() => setLightbox(message.file_url)} />}{message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}<p className="text-[10px] opacity-60 mt-1 text-right">{new Date(message.created_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p></div></RoleMessageEffect>{(sent || isAdmin) && <button onClick={() => del(message.id)} className="p-1 text-muted-foreground/50 hover:text-destructive shrink-0" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>}</div>; })}</div>
    <form onSubmit={handleSubmit} className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border flex items-center gap-2 bg-card"><label className="p-2 rounded-lg hover:bg-secondary cursor-pointer shrink-0"><ImageIcon className="w-5 h-5" /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhoto} disabled={uploading} /></label><input value={text} onChange={(event) => changeText(event.target.value)} maxLength={2000} placeholder="Mesaj yazın..." className="flex-1 min-w-0 bg-secondary rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><button type="submit" disabled={sending || uploading || !text.trim()} className="w-11 h-11 shrink-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full disabled:opacity-50" aria-label="Mesaj gönder"><Send className="w-5 h-5" /></button>{uploading && <span className="text-xs text-muted-foreground animate-pulse shrink-0">...</span>}</form>
    {reportOpen && <ReportDialog targetId={mine ? friendship.recipient_id : friendship.requester_id} targetName={name} context="dm" contextId={friendship.id} onClose={() => setReportOpen(false)} />}
    {lightbox && <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4"><button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button><Image src={lightbox} className="max-w-full max-h-full rounded-lg" fittingType="fit" /></div>}
  </section>;
}