import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, Settings, Trash2, X, Image as ImageIcon, Check, CheckCheck, Copy } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import useChatMessages from '@/hooks/useChatMessages';
import ReportDialog from '@/components/ReportDialog';
import RoleMessageEffect from '@/components/role/RoleMessageEffect';
import ChatSettingsPanel from '@/components/friends/ChatSettingsPanel';
import { useMessageRealtime } from '@/components/messages/MessageRealtimeProvider';


export default function ChatPanel({ conversation, userId, onBack, online, embedded }) {
  const { messages: allMessages, loading, sending, send: sendMsg, markRead, deleteMessage, deleteConversation } = useChatMessages(conversation?.id);
  const { user: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const { conversations, optimisticPatch } = useMessageRealtime();
  const realtimeConversation = conversations.find((item) => item.id === conversation?.id) || conversation;
  const isAdmin = currentUser?.role === 'admin';
  const [friendProfile, setFriendProfile] = useState(null);
  const [friendship, setFriendship] = useState(null);
  const [text, setText] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [offlineFor, setOfflineFor] = useState(conversation?.offline_for || []);
  const [readReceiptsDisabledFor, setReadReceiptsDisabledFor] = useState(conversation?.read_receipts_disabled_for || []);
  const [reportOpen, setReportOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [keyboard, setKeyboard] = useState({ open: false, height: 0 });
  const [friendTyping, setFriendTyping] = useState(false);
  const [profilePopup, setProfilePopup] = useState(false);
  const messagesRef = useRef(null);
  const layoutHeightRef = useRef(window.innerHeight);
  const keyboardOpenRef = useRef(false);
  const typingTimer = useRef(null);
  const typingActive = useRef(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const prevFriendStatus = useRef(null);
  const [acceptedNotice, setAcceptedNotice] = useState(false);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport || embedded) return;
    const updateKeyboard = () => {
      const layoutHeight = layoutHeightRef.current;
      const vvHeight = visualViewport.height;
      const vvTop = visualViewport.offsetTop;
      const keyboardHeight = Math.max(0, layoutHeight - vvTop - vvHeight);
      const isOpen = keyboardHeight > 120;
      if (isOpen && !keyboardOpenRef.current) {
        keyboardOpenRef.current = true;
        requestAnimationFrame(() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' }));
      } else if (!isOpen && keyboardOpenRef.current) {
        keyboardOpenRef.current = false;
        requestAnimationFrame(() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' }));
      }
      setKeyboard({ open: isOpen, height: keyboardHeight });
      if (!isOpen) layoutHeightRef.current = window.innerHeight;
    };
    updateKeyboard();
    visualViewport.addEventListener('resize', updateKeyboard);
    visualViewport.addEventListener('scroll', updateKeyboard);
    return () => {
      visualViewport.removeEventListener('resize', updateKeyboard);
      visualViewport.removeEventListener('scroll', updateKeyboard);
    };
  }, [embedded]);

  // Sayfa kaymasını önle — iOS Safari input focus'ta body'yi otomatik kaydırır
  useEffect(() => {
    if (embedded) return;
    const body = document.body;
    const prev = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width };
    const scrollY = window.scrollY;
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [embedded]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [allMessages]);

  useEffect(() => {
    return () => { clearTimeout(typingTimer.current); };
  }, []);

  useEffect(() => {
    if (!realtimeConversation?.typing_user_id || realtimeConversation.typing_user_id === userId) { setFriendTyping(false); return; }
    const elapsed = Date.now() - new Date(realtimeConversation.typing_updated_at || 0).getTime();
    if (elapsed >= 3000) { setFriendTyping(false); return; }
    setFriendTyping(true);
    const timer = setTimeout(() => setFriendTyping(false), 3000 - elapsed);
    return () => clearTimeout(timer);
  }, [realtimeConversation?.typing_user_id, realtimeConversation?.typing_updated_at, userId]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unreadCount = conversation.user1_id === userId ? (conversation.unread_user1 || 0) : (conversation.unread_user2 || 0);
    window.dispatchEvent(new CustomEvent('social-thread-open', { detail: { conversationId: conversation.id, unreadCount } }));
    markRead();
    return () => window.dispatchEvent(new Event('social-thread-close'));
  }, [conversation?.id, markRead]);

  // Sohbete özel çevrim ve okundu tercihlerini iki tarafta da anlık senkronla.
  useEffect(() => {
    if (!conversation?.id) return;
    setOfflineFor(conversation.offline_for || []);
    setReadReceiptsDisabledFor(conversation.read_receipts_disabled_for || []);
    const unsub = base44.entities.Conversation.subscribe((event) => {
      if ((event.data?.id || event.id) !== conversation.id) return;
      if (Array.isArray(event.data?.offline_for)) setOfflineFor(event.data.offline_for);
      if (Array.isArray(event.data?.read_receipts_disabled_for)) setReadReceiptsDisabledFor(event.data.read_receipts_disabled_for);
    });
    return unsub;
  }, [conversation?.id, userId]);

  // Arkadaş profilini ve friendship kaydını çek — gerçek zamanlı abonelik
  useEffect(() => {
    if (!conversation) return;
    const friendId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
    if (!friendId) return;
    let active = true;
    base44.functions.invoke('user-profile', { user_id: friendId })
      .then((res) => { if (active) setFriendProfile(res.data); })
      .catch(() => {});
    const fetchFriendship = () => {
      base44.entities.Friendship.filter({ members: userId }, '-updated_date', 200)
        .then((items) => { if (active) setFriendship(items.find((f) => (f.members || []).includes(friendId)) || null); })
        .catch(() => {});
    };
    fetchFriendship();
    const unsub = base44.entities.Friendship.subscribe(() => fetchFriendship());
    return () => { active = false; unsub(); };
  }, [conversation?.id, userId]);

  // İstek onaylandığında sohbet içinde sistem mesajı göster
  useEffect(() => {
    if (!friendship) return;
    if (prevFriendStatus.current === 'pending' && friendship.status === 'accepted') {
      setAcceptedNotice(true);
    }
    prevFriendStatus.current = friendship.status;
  }, [friendship?.status]);

  if (!conversation) return <section className="bg-card border border-border rounded-xl min-h-80 flex items-center justify-center text-sm text-muted-foreground">Mesajlaşmak için bir arkadaş seçin.</section>;

  const mine = conversation.user1_id === userId;
  const name = mine ? conversation.user2_name : conversation.user1_name;
  const avatar = mine ? conversation.user2_avatar : conversation.user1_avatar;
  const friendId = mine ? conversation.user2_id : conversation.user1_id;
  const items = allMessages;
  const onlineEnabled = !offlineFor.includes(userId);
  const readReceiptsEnabled = !readReceiptsDisabledFor.includes(userId);
  const friendReadReceiptsEnabled = !readReceiptsDisabledFor.includes(friendId);
  const friendVisibleOnline = online && !offlineFor.includes(friendId);
  const canMessage = isAdmin || friendProfile?.role === 'admin' || friendship?.status === 'accepted';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    clearTimeout(typingTimer.current);
    typingActive.current = false;
    const messageText = text.trim();
    setText('');
    try {
      await sendMsg(messageText);
      base44.functions.invoke('dm-service', { action: 'typing', conversation_id: conversation.id, typing: false }).catch(() => {});
    } catch {}
  };

  const changeText = (value) => {
    setText(value);
    if (!typingActive.current && value.trim()) {
      typingActive.current = true;
      base44.functions.invoke('dm-service', { action: 'typing', conversation_id: conversation.id, typing: true }).catch(() => {});
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingActive.current = false;
      base44.functions.invoke('dm-service', { action: 'typing', conversation_id: conversation.id, typing: false }).catch(() => {});
    }, 1200);
  };

  const block = async () => {
    if (!friendship) { toast({ title: 'Arkadaşlık kaydı bulunamadı', variant: 'destructive' }); return; }
    setBlocking(true);
    try {
      await base44.functions.invoke('friend-service', { action: 'block', friendship_id: friendship.id });
      setSettingsOpen(false);
    } catch {} finally { setBlocking(false); }
  };
  const unblock = async () => {
    if (!friendship) { toast({ title: 'Arkadaşlık kaydı bulunamadı', variant: 'destructive' }); return; }
    setUnblocking(true);
    try {
      await base44.functions.invoke('friend-service', { action: 'unblock', friendship_id: friendship.id });
      setSettingsOpen(false);
    } catch { toast({ title: 'Engel kaldırılamadı', variant: 'destructive' }); }
    finally { setUnblocking(false); }
  };
  const toggleReadReceipts = async () => {
    if (!conversation?.id) return;
    const nextEnabled = !readReceiptsEnabled;
    const previous = readReceiptsDisabledFor;
    const next = nextEnabled ? previous.filter((id) => id !== userId) : [...new Set([...previous, userId])];
    setReadReceiptsDisabledFor(next);
    optimisticPatch(conversation.id, { read_receipts_disabled_for: next });
    try {
      const response = await base44.functions.invoke('dm-service', { action: 'toggle_read_receipts', conversation_id: conversation.id, enabled: nextEnabled });
      setReadReceiptsDisabledFor(response.data?.read_receipts_disabled_for || []);
    } catch {
      setReadReceiptsDisabledFor(previous);
      optimisticPatch(conversation.id, { read_receipts_disabled_for: previous });
      toast({ title: 'Okundu tikleri değiştirilemedi', variant: 'destructive' });
    }
  };
  const toggleOnline = async () => {
    if (!conversation?.id) return;
    const nextEnabled = !onlineEnabled;
    const previous = offlineFor;
    const next = nextEnabled ? previous.filter((id) => id !== userId) : [...new Set([...previous, userId])];
    setOfflineFor(next);
    optimisticPatch(conversation.id, { offline_for: next });
    try {
      const response = await base44.functions.invoke('dm-service', { action: 'toggle_offline', conversation_id: conversation.id, online: nextEnabled });
      setOfflineFor(response.data?.offline_for || []);
    } catch {
      setOfflineFor(previous);
      optimisticPatch(conversation.id, { offline_for: previous });
      toast({ title: 'Değiştirilemedi', variant: 'destructive' });
    }
  };
  const clearChat = async () => { setClearing(true); try { await deleteConversation(); setSettingsOpen(false); } catch {} finally { setClearing(false); } };
  const unfriend = async () => {
    if (!friendship) { toast({ title: 'Arkadaşlık kaydı bulunamadı', variant: 'destructive' }); return; }
    setUnfriending(true);
    try {
      await base44.functions.invoke('friend-service', { action: 'unfriend', friendship_id: friendship.id });
      setFriendship((prev) => prev ? { ...prev, status: 'removed' } : prev);
    } catch { toast({ title: 'Kaldırılamadı', variant: 'destructive' }); }
    finally { setUnfriending(false); }
  };
  const refriend = async () => {
    if (!friendship) { toast({ title: 'Arkadaşlık kaydı bulunamadı', variant: 'destructive' }); return; }
    setUnfriending(true);
    try {
      await base44.functions.invoke('friend-service', { action: 'refriend', friendship_id: friendship.id });
      setFriendship((prev) => prev ? { ...prev, status: 'pending', requester_id: userId } : prev);
    } catch { toast({ title: 'Eklenemedi', variant: 'destructive' }); }
    finally { setUnfriending(false); }
  };
  const acceptRequest = async () => {
    if (!friendship) return;
    try {
      await base44.functions.invoke('friend-service', { action: 'respond', friendship_id: friendship.id, accept: true });
      setFriendship((prev) => prev ? { ...prev, status: 'accepted' } : prev);
      toast({ title: 'Arkadaşlık isteğiniz onaylandı' });
    } catch { toast({ title: 'Kabul edilemedi', variant: 'destructive' }); }
  };
  const rejectRequest = async () => {
    if (!friendship) return;
    try {
      await base44.functions.invoke('friend-service', { action: 'respond', friendship_id: friendship.id, accept: false });
      setFriendship((prev) => prev ? { ...prev, status: 'rejected' } : prev);
    } catch { toast({ title: 'Reddedilemedi', variant: 'destructive' }); }
  };

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(f.type)) { toast({ title: 'Sadece JPG, PNG, WEBP', variant: 'destructive' }); e.target.value = ''; return; }
    if (f.size > 10 * 1024 * 1024) { toast({ title: 'Maksimum 10 MB', variant: 'destructive' }); e.target.value = ''; return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      await base44.functions.invoke('send-chat-image', { file_url, context: 'dm', context_id: conversation.id, text: '' });
    } catch (err) {
      toast({ title: 'Görsel gönderilemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
    } finally { setUploading(false); e.target.value = ''; }
  };

  const sectionStyle = embedded ? undefined : { ...(keyboard.open ? { bottom: `${keyboard.height}px` } : {}) };
  return <section style={sectionStyle} className={embedded ? "relative inset-auto z-auto h-full min-h-0 flex flex-col bg-card" : "fixed top-0 left-0 right-0 bottom-0 z-[60] min-h-0 flex flex-col overflow-hidden border-y border-border bg-card sm:relative sm:inset-auto sm:z-auto sm:h-[72vh] sm:min-h-[72vh] sm:rounded-xl sm:border sm:pt-0"} onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchStart.current.x; const dy = e.changedTouches[0].clientY - touchStart.current.y; if (dx > 80 && dx > Math.abs(dy) * 1.5) onBack(); }}>
    <header className="relative shrink-0 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border bg-card/95 backdrop-blur"><div className="flex items-center justify-between"><button onClick={onBack} className="p-2 rounded-full hover:bg-secondary" aria-label="Geri dön"><ArrowLeft className="w-6 h-6" /></button><button onClick={() => setSettingsOpen(true)} className="p-2 rounded-full hover:bg-secondary" aria-label="Sohbet ayarları"><Settings className="w-5 h-5" /></button></div><div className="flex flex-col items-center gap-1 cursor-pointer active:opacity-70" onClick={() => setProfilePopup(true)}>{avatar ? <div className="rounded-full p-[2px] bg-gradient-to-br from-pink-400 via-pink-300 to-purple-400 shadow-[0_0_12px_rgba(244,114,182,0.6)]"><Image src={avatar} className="w-14 h-14 rounded-full" fittingType="fill" /></div> : <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">{name?.[0]}</div>}<h2 className="font-bold text-sm truncate max-w-[70%]">{name}</h2><p className={`text-[11px] ${friendTyping || friendVisibleOnline ? 'text-green-500' : 'text-muted-foreground'}`}>{friendTyping ? 'Yazıyor...' : friendVisibleOnline ? '• Çevrim içi' : 'Çevrim dışı'}</p></div>
    </header>
    {settingsOpen && <ChatSettingsPanel name={name} avatar={avatar} friendProfile={friendProfile} isBlocked={(friendship?.status === 'blocked' && (friendship?.blocked_by || []).includes(userId))} isFriend={friendship?.status === 'accepted'} requestSent={friendship?.status === 'pending' && friendship?.requester_id === userId} showFriendButton={!!friendship} onlineEnabled={onlineEnabled} readReceiptsEnabled={readReceiptsEnabled} onToggleReadReceipts={toggleReadReceipts} onToggleOnline={toggleOnline} onBlock={(friendship?.status === 'blocked' && (friendship?.blocked_by || []).includes(userId)) ? unblock : block} onUnfriend={unfriend} onRefriend={refriend} onClearChat={clearChat} onReport={() => { setSettingsOpen(false); setReportOpen(true); }} onClose={() => setSettingsOpen(false)} blocking={blocking || unblocking} unfriending={unfriending} clearing={clearing} />}
    <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}><div className="rounded-xl bg-secondary/70 px-4 py-3 text-center text-xs text-muted-foreground">{name} ile sohbet</div>{loading && <p className="text-center text-sm text-muted-foreground py-12">Mesajlar yükleniyor...</p>}{!loading && !items.length && <p className="text-center text-sm text-muted-foreground py-12">İlk mesajı siz gönderin.</p>}{items.map((message) => { const sent = message.sender_id === userId; const senderRoleKey = sent ? (currentUser?.display_role || '') : (friendProfile?.display_role || ''); return <div key={message.id} className={`group flex items-end gap-1.5 ${sent ? 'justify-end' : 'justify-start'}`}><RoleMessageEffect roleKey={senderRoleKey} className="max-w-[80%]"><div className={`rounded-2xl px-3.5 py-2 text-sm shadow-md ${sent ? 'rounded-br-md bg-[#2c1e55] text-white' : 'rounded-bl-md bg-[#1e1e24] text-white'}`}>{message.file_url && <Image src={message.file_url} alt="foto" className="rounded-lg max-w-[200px] max-h-56 object-cover mb-1 cursor-pointer" fittingType="fit" onClick={() => setLightbox(message.file_url)} />}{message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}<p className="text-[10px] opacity-50 mt-1 text-right flex items-center justify-end gap-1">{new Date(message.created_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}{sent && ((message.read_by || []).includes(message.receiver_id) ? <CheckCheck className={`w-3.5 h-3.5 ${friendReadReceiptsEnabled ? 'text-violet-300' : ''}`} /> : <Check className="w-3.5 h-3.5" />)}</p></div></RoleMessageEffect>{(sent || isAdmin) && <button onClick={() => deleteMessage(message.id)} className="p-1 text-muted-foreground/50 hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>}</div>; })}{friendship?.status === 'blocked' && (friendship?.blocked_by || []).includes(friendId) && <div className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-xs text-destructive">Engellendiniz — bu kullanıcı sizi engelledi</div>}{friendship?.status === 'blocked' && (friendship?.blocked_by || []).includes(userId) && <div className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-xs text-destructive">Bu kullanıcıyı engellediniz — engeli kaldırın</div>}{friendship?.status === 'pending' && friendship?.recipient_id === userId && <div className="rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 flex items-center justify-between gap-3"><span className="text-sm text-foreground">{name} sizi arkadaş olarak eklemek istiyor</span><div className="flex gap-2 shrink-0"><button onClick={acceptRequest} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold">Onayla</button><button onClick={rejectRequest} className="bg-secondary text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold">Red</button></div></div>}{friendship?.status === 'pending' && friendship?.requester_id === userId && <div className="rounded-xl bg-secondary/70 px-4 py-3 text-center text-xs text-muted-foreground">Arkadaşlık isteği gönderildi — onay bekleniyor</div>}{acceptedNotice && <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-center text-xs text-green-400">✓ Arkadaşlık isteğiniz onaylandı</div>}
{friendship?.status === 'rejected' && <div className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-xs text-destructive">Arkadaşlık isteğiniz reddedildi</div>}{friendship?.status === 'removed' && <div className="rounded-xl bg-secondary/70 px-4 py-3 text-center text-xs text-muted-foreground">Arkadaşlık kaldırıldı — tekrar eklemek için ayarlardan istek gönderin</div>}</div>
    <form onSubmit={handleSubmit} className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border flex items-center gap-2 bg-card"><label className="p-2 rounded-lg hover:bg-secondary cursor-pointer shrink-0"><ImageIcon className="w-5 h-5" /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhoto} disabled={uploading} /></label><input value={text} onChange={(event) => changeText(event.target.value)} disabled={!canMessage} maxLength={2000} placeholder={canMessage ? 'Mesaj yazın...' : 'Yalnızca arkadaşlar mesajlaşabilir'} className="flex-1 min-w-0 bg-secondary rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" /><button type="submit" disabled={!canMessage || sending || uploading || !text.trim()} className="w-11 h-11 shrink-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full disabled:opacity-50" aria-label="Mesaj gönder"><Send className="w-5 h-5" /></button>{uploading && <span className="text-xs text-muted-foreground animate-pulse shrink-0">...</span>}</form>
    {profilePopup && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60" onClick={() => setProfilePopup(false)}><div className="bg-card border border-border rounded-xl p-5 w-64 max-w-[90%]" onClick={(e) => e.stopPropagation()}><div className="flex flex-col items-center gap-3">{avatar ? <Image src={avatar} className="w-16 h-16 rounded-full" fittingType="fill" /> : <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">{name?.[0]}</div>}<h3 className="font-bold text-lg">{name}</h3>{friendProfile?.member_id && <div className="w-full flex items-center gap-2 bg-secondary rounded-lg px-3 py-2"><span className="text-xs text-muted-foreground shrink-0">Kimlik:</span><span className="text-sm font-mono flex-1 truncate">{friendProfile.member_id}</span><button onClick={() => { navigator.clipboard?.writeText(friendProfile.member_id); toast({ title: 'Kimlik kopyalandı' }); }} className="p-1.5 hover:bg-primary/10 rounded-lg shrink-0"><Copy className="w-4 h-4 text-primary" /></button></div>}<button onClick={() => setProfilePopup(false)} className="w-full bg-secondary rounded-lg py-2 text-sm font-semibold">Kapat</button></div></div></div>}
    {reportOpen && <ReportDialog targetId={friendId} targetName={name} context="dm" contextId={conversation.id} onClose={() => setReportOpen(false)} />}
    {lightbox && <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4"><button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button><Image src={lightbox} className="max-w-full max-h-full rounded-lg" fittingType="fit" /></div>}
  </section>;
}