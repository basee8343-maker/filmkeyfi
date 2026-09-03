import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, X, Smile, Trash2, MessageSquareOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import ChatUserMenu from '@/components/player/ChatUserMenu';
import ReportDialog from '@/components/ReportDialog';
import RoleBadge from '@/components/RoleBadge';
import useMessageProfiles from '@/hooks/useMessageProfiles';
import { mergeMessages, upsertMessage } from '@/lib/realtimeMessages';
import { parseRoleMetadata } from '@/lib/roles';

const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '👏', '😱', '😢', '🎬', '🍿', '❤️', '🎉'];

export default function ChatOverlay({ roomId, chatEnabled, isOwner, isAdmin, onClose }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modTarget, setModTarget] = useState(null); // { userId, userName, userAvatar }
  const [userMenu, setUserMenu] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const scrollRef = useRef(null);
  const profiles = useMessageProfiles(messages.map((message) => message.user_id));

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const load = () => {
    base44.entities.RoomMessage.filter({ room_id: roomId }, 'created_date', 200)
      .then((r) => { setMessages((current) => mergeMessages(current, r)); setLoading(false); requestAnimationFrame(scrollToBottom); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.RoomMessage.subscribe((ev) => {
      if (ev.data?.room_id !== roomId) return;
      if (ev.type === 'delete') setMessages((prev) => prev.filter((message) => message.id !== ev.id));
      else setMessages((prev) => {
        const tempMatch = prev.find((message) => message.id?.startsWith('temp-') && message.user_id === ev.data.user_id && message.text === ev.data.text);
        const clean = tempMatch ? prev.filter((message) => message.id !== tempMatch.id) : prev;
        return upsertMessage(clean, ev.data);
      });
      setTimeout(scrollToBottom, 50);
    });
    const reconnect = () => load();
    window.addEventListener('online', reconnect);
    return () => { unsub(); window.removeEventListener('online', reconnect); };
  }, [roomId]);

  const send = (e) => {
    e?.preventDefault();
    if (!text.trim() || !user) return;
    const tempId = 'temp-' + Date.now();
    const optimistic = { id: tempId, room_id: roomId, user_id: user.id, user_name: user.username || user.full_name || 'Kullanıcı', user_avatar: user.avatar || '', text: text.trim(), type: 'user', created_date: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setText(''); setShowEmoji(false);
    setTimeout(scrollToBottom, 50);
    base44.functions.invoke('send-room-message', { room_id: roomId, text: text.trim() })
      .catch((err) => { setMessages((prev) => prev.filter((m) => m.id !== tempId)); toast({ title: 'Mesaj gönderilemedi', description: err.response?.data?.error || err.message, variant: 'destructive' }); });
  };

  const del = async (id) => {
    try { await base44.entities.RoomMessage.delete(id); setMessages((p) => p.filter((m) => m.id !== id)); }
    catch (err) { toast({ title: 'Silinemedi', variant: 'destructive' }); }
  };

  const clearAll = async () => {
    if (!confirm('Sohbetin tüm mesajlarını silmek istediğinize emin misiniz?')) return;
    try { await base44.functions.invoke('clear-room-messages', { room_id: roomId }); setMessages([]); toast({ title: 'Tüm mesajlar silindi' }); }
    catch (err) { toast({ title: 'Silinemedi', description: err.response?.data?.error || err.message, variant: 'destructive' }); }
  };

  const handleUserClick = (e, m) => {
    if (m.user_id === user?.id) return;
    e.preventDefault();
    if (isAdmin) {
      setModTarget({ userId: m.user_id, userName: m.user_name, userAvatar: m.user_avatar });
    } else {
      setUserMenu({ userId: m.user_id, userName: m.user_name });
    }
  };

  if (!chatEnabled) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
        <MessageSquareOff className="w-10 h-10 mb-3" />
        <p className="font-semibold">Sohbet kapalı</p>
        <p className="text-sm">Oda sahibi sohbeti kapatmış.</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-card/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
        <h3 className="font-bold flex items-center gap-2">💬 Sohbet <span className="text-xs text-muted-foreground font-normal">({messages.length})</span></h3>
        <div className="flex items-center gap-1.5">
          {isOwner && <button onClick={clearAll} className="px-2 py-1 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold">TÜMÜNÜ SİL</button>}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {loading ? <p className="text-center text-sm text-muted-foreground py-8">Yükleniyor...</p> :
         messages.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">Henüz mesaj yok. İlk mesajı sen at! 🍿</p> :
         messages.map((m) => (
           <div key={m.id} className={`flex gap-2 group ${m.type === 'system' ? 'justify-center' : ''}`}>
             {m.type === 'system' ? (
               (() => {
                 const { text: cleanText, color, hasRole } = parseRoleMetadata(m.text);
                 const isRole = hasRole && /^\p{Extended_Pictographic}/u.test(cleanText);
                 return (
                   <span
                     className={`text-xs px-3 py-1.5 rounded-full ${isRole ? 'font-bold neon-entrance' : 'text-muted-foreground bg-secondary/50'}`}
                     style={isRole ? {
                       background: `linear-gradient(135deg, ${color}33, ${color}22)`,
                       color: color,
                       boxShadow: `0 0 10px -1px ${color}80`,
                       border: `1px solid ${color}55`,
                     } : {}}
                   >
                     {cleanText}
                   </span>
                 );
               })()
             ) : (
               <>
                 <Link to={`/kullanici/${m.user_id}`} onClick={(e) => handleUserClick(e, m)} className="shrink-0">
                   {(profiles[m.user_id]?.avatar || m.user_avatar) ? <Image src={profiles[m.user_id]?.avatar || m.user_avatar} className="w-7 h-7 rounded-full object-cover" fittingType="fill" /> : <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">{(m.user_name || '?')[0]}</span>}
                 </Link>
                 <div className="min-w-0 flex-1">
                   <div className="flex items-center gap-1.5">
                     <Link to={`/kullanici/${m.user_id}`} onClick={(e) => handleUserClick(e, m)} className="text-xs font-semibold truncate hover:underline">{m.user_name}{user?.id === m.user_id && ' (Sen)'}</Link>
                     {profiles[m.user_id] && (profiles[m.user_id].display_role || profiles[m.user_id].custom_role?.name) && <RoleBadge user={profiles[m.user_id]} size="sm" showLabel={false} />}
                   </div>
                   <p className="text-sm break-words bg-secondary/50 rounded-lg px-2.5 py-1.5 inline-block">{m.text}</p>
                 </div>
                 {(isOwner || user?.id === m.user_id) && (
                   <button onClick={() => del(m.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive" title={isOwner && user?.id !== m.user_id ? 'Sahip: herkesten sil' : 'Sil'}><Trash2 className="w-3.5 h-3.5" /></button>
                 )}
               </>
             )}
           </div>
         ))}
         </div>
      {showEmoji && (
        <div className="px-3 py-2 border-t border-border flex flex-wrap gap-1">
          {EMOJIS.map((e) => <button key={e} onClick={() => setText((t) => t + e)} className="text-xl hover:bg-secondary rounded p-1">{e}</button>)}
        </div>
      )}
      <form onSubmit={send} className="p-3 border-t border-border flex items-center gap-2">
        <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg hover:bg-secondary"><Smile className="w-5 h-5" /></button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yazın..." className="flex-1 bg-secondary/60 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" disabled={!text.trim()} className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="w-4 h-4" /></button>
      </form>

      {modTarget && (
        <ChatUserMenu
          userId={modTarget.userId}
          userName={modTarget.userName}
          userAvatar={modTarget.userAvatar}
          roomId={roomId}
          onClose={() => setModTarget(null)}
        />
      )}
      {userMenu && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setUserMenu(null)}>
          <div className="bg-card border border-border rounded-xl p-3 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-2">{userMenu.userName}</p>
            <Link to={`/kullanici/${userMenu.userId}`} onClick={() => setUserMenu(null)} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm">Profili Gör</Link>
            <button onClick={() => { setReportTarget(userMenu); setUserMenu(null); }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive text-sm font-semibold">Şikayet Et</button>
          </div>
        </div>
      )}
      {reportTarget && <ReportDialog targetId={reportTarget.userId} targetName={reportTarget.userName} context="room" contextId={roomId} onClose={() => setReportTarget(null)} />}
    </div>
  );
}