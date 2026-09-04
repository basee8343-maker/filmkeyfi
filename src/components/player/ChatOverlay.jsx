import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, X, Smile, Trash2, MessageSquareOff, Image as ImageIcon, Settings, MessagesSquare, Shield, Crown } from 'lucide-react';
import VoiceControls from '@/components/player/VoiceControls';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import ChatUserMenu from '@/components/player/ChatUserMenu';
import ReportDialog from '@/components/ReportDialog';
import RoleBadge from '@/components/RoleBadge';
import ProfileFrame from '@/components/ProfileFrame';
import useMessageProfiles from '@/hooks/useMessageProfiles';
import { mergeMessages, upsertMessage } from '@/lib/realtimeMessages';
import { parseRoleMetadata, getRoleInfo, isModerator } from '@/lib/roles';
import RoleMessageEffect from '@/components/role/RoleMessageEffect';
import RoleNameEffect from '@/components/role/RoleNameEffect';

const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '👏', '😱', '😢', '🎬', '🍿', '❤️', '🎉'];

export default function ChatOverlay({ roomId, chatEnabled, isOwner, isAdmin, onClose, autoDeleteMinutes = 0, countdownText = '', onSetAutoDelete, voice, voiceEnabled, onSettings, onDirect, directUnread = 0, ownerId, roomModerators = [] }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modTarget, setModTarget] = useState(null); // { userId, userName, userAvatar }
  const [userMenu, setUserMenu] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [menuProfile, setMenuProfile] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [showAutoDeleteMenu, setShowAutoDeleteMenu] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState(user?.blocked_users || []);
  useEffect(() => { setBlockedUsers(user?.blocked_users || []); }, [user?.blocked_users]);
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
    setUserMenu({ userId: m.user_id, userName: m.user_name, userAvatar: m.user_avatar });
  };

  useEffect(() => {
    if (!userMenu?.userId) { setMenuProfile(null); return; }
    base44.functions.invoke('user-profile', { user_id: userMenu.userId }).then((res) => setMenuProfile(res.data)).catch(() => {});
  }, [userMenu?.userId]);

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(f.type)) { toast({ title: 'Sadece JPG, PNG, WEBP', variant: 'destructive' }); e.target.value = ''; return; }
    if (f.size > 10 * 1024 * 1024) { toast({ title: 'Maksimum 10 MB', variant: 'destructive' }); e.target.value = ''; return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      await base44.functions.invoke('send-chat-image', { file_url, context: 'room', context_id: roomId, text: '' });
    } catch (err) {
      toast({ title: 'Görsel gönderilemedi', description: err.response?.data?.error || err.message, variant: 'destructive' });
    } finally { setUploading(false); e.target.value = ''; }
  };

  const copyMemberId = async () => {
    const mid = menuProfile?.member_id;
    if (!mid) return;
    try { await navigator.clipboard.writeText(mid); toast({ title: 'Üye No kopyalandı', description: mid }); }
    catch { toast({ title: 'Kopyalanamadı', variant: 'destructive' }); }
  };
  const blockUser = async () => {
    try { await base44.functions.invoke('role-management', { action: 'ban_user', user_id: userMenu.userId, reason: 'Sohbet üzerinden engellendi' }); toast({ title: 'Kullanıcı engellendi' }); setUserMenu(null); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };
  const deleteUser = async () => {
    if (!confirm('Bu kullanıcı kalıcı olarak silinsin mi?')) return;
    try { await base44.entities.User.delete(userMenu.userId); toast({ title: 'Kullanıcı silindi' }); setUserMenu(null); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const kickFromRoom = async () => {
    try { await base44.functions.invoke('room-presence', { action: 'kick', room_id: roomId, target_id: userMenu.userId }); toast({ title: 'Kullanıcı odadan atıldı' }); setUserMenu(null); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const personalBlock = async () => {
    try {
      const newBlocked = [...new Set([...blockedUsers, userMenu.userId])];
      await base44.auth.updateMe({ blocked_users: newBlocked });
      setBlockedUsers(newBlocked);
      toast({ title: 'Kullanıcı engellendi', description: 'Artık mesajlarını görmeyeceksiniz.' });
      setUserMenu(null);
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-card/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
        <h3 className="font-bold flex items-center gap-2">💬 Sohbet {chatEnabled && <span className="text-xs text-muted-foreground font-normal">({messages.length})</span>}</h3>
        <div className="flex items-center gap-1.5">
          {isOwner && chatEnabled && (
            <div className="relative">
              <button onClick={() => setShowAutoDeleteMenu(!showAutoDeleteMenu)} className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold whitespace-nowrap">⏱ Oto-sil: {autoDeleteMinutes ? `${autoDeleteMinutes}dk` : 'Kapalı'}</button>
              {showAutoDeleteMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl p-2 w-36">
                  <p className="text-xs text-muted-foreground mb-1.5 text-center">Otomatik Silme Süresi</p>
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => { onSetAutoDelete?.(0); setShowAutoDeleteMenu(false); }} className={`px-1.5 py-1 rounded text-xs font-semibold ${!autoDeleteMinutes ? 'bg-blue-500/30 text-blue-400' : 'hover:bg-secondary'}`}>Kapalı</button>
                    {[2,3,4,5,6,7,8,9,10].map((m) => (
                      <button key={m} onClick={() => { onSetAutoDelete?.(m); setShowAutoDeleteMenu(false); }} className={`px-1.5 py-1 rounded text-xs font-semibold ${autoDeleteMinutes === m ? 'bg-blue-500/30 text-blue-400' : 'hover:bg-secondary'}`}>{m}dk</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {isOwner && chatEnabled && <button onClick={clearAll} className="px-2 py-1 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold">TÜMÜNÜ SİL</button>}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>
      </div>
      {(voiceEnabled || onSettings || onDirect) && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
          {voiceEnabled && <VoiceControls voice={voice} />}
          {isOwner && onSettings && <button onClick={onSettings} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/60 text-xs font-semibold hover:bg-secondary whitespace-nowrap"><Settings className="w-4 h-4" /> Ayarlar</button>}
          {onDirect && <button onClick={onDirect} className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/60 text-xs font-semibold hover:bg-secondary whitespace-nowrap"><MessagesSquare className="w-4 h-4" /> Mesaj{directUnread > 0 && <span className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground flex items-center justify-center">{directUnread > 99 ? '99+' : directUnread}</span>}</button>}
        </div>
      )}
      {!chatEnabled ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
          <MessageSquareOff className="w-10 h-10 mb-3" />
          <p className="font-semibold">Sohbet kapalı</p>
          <p className="text-sm">Oda sahibi sohbeti kapatmış.</p>
        </div>
      ) : (
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
        {loading ? <p className="text-center text-sm text-muted-foreground py-8">Yükleniyor...</p> :
         messages.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">Henüz mesaj yok. İlk mesajı sen at! 🍿</p> :
         messages.filter((m) => m.type === 'system' || !blockedUsers.includes(m.user_id)).map((m) => (
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
                    {profiles[m.user_id]?.profile_frame ? <ProfileFrame frame={profiles[m.user_id].profile_frame} size="sm" avatar={profiles[m.user_id]?.avatar || m.user_avatar} name={m.user_name} /> : (profiles[m.user_id]?.avatar || m.user_avatar) ? <Image src={profiles[m.user_id]?.avatar || m.user_avatar} className="w-7 h-7 rounded-full object-cover" fittingType="fill" /> : <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">{(m.user_name || '?')[0]}</span>}
                  </Link>
                  <div className="min-w-0 flex-1">
                   <div className="flex items-center gap-1.5 flex-wrap">
                     {m.user_id === ownerId && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                     {(roomModerators.includes(m.user_id) || isModerator(profiles[m.user_id])) && m.user_id !== ownerId && <Shield className="w-3 h-3 text-blue-400 shrink-0" />}
                     <Link to={`/kullanici/${m.user_id}`} onClick={(e) => handleUserClick(e, m)} className="text-xs font-semibold truncate hover:underline">
                       <RoleNameEffect nameEffect={getRoleInfo(profiles[m.user_id] || m)?.name_effect} color={getRoleInfo(profiles[m.user_id] || m)?.color}>{m.user_name}{user?.id === m.user_id && ' (Sen)'}</RoleNameEffect>
                     </Link>
                     {m.user_id === ownerId && <span className="text-[10px] text-amber-400 font-bold shrink-0">Oda Sahibi</span>}
                     {profiles[m.user_id] && (profiles[m.user_id].display_role || profiles[m.user_id].custom_role?.name) && <RoleBadge user={profiles[m.user_id]} size="sm" showLabel={false} />}
                   </div>
                   <RoleMessageEffect roleKey={profiles[m.user_id]?.display_role || (profiles[m.user_id]?.custom_role?.name ? 'custom' : '')} msgEffect={getRoleInfo(profiles[m.user_id] || m)?.msg_effect} msgColor={getRoleInfo(profiles[m.user_id] || m)?.color}>
                      {m.file_url && <Image src={m.file_url} alt="foto" className="rounded-lg max-w-[180px] max-h-44 object-cover mb-1 cursor-pointer block" fittingType="fit" onClick={() => setLightbox(m.file_url)} />}
                      {m.text && <p className="text-sm break-words bg-secondary/50 rounded-lg px-2.5 py-1.5 inline-block">{m.text}</p>}
                    </RoleMessageEffect>
                  </div>
                  {(isOwner || user?.id === m.user_id) && (
                    <button onClick={() => del(m.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive" title={isOwner && user?.id !== m.user_id ? 'Sahip: herkesten sil' : 'Sil'}><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </>
              )}
            </div>
          ))}
          </div>
      )}
      {chatEnabled && autoDeleteMinutes > 0 && countdownText && (
        <div className="px-3 py-1.5 bg-blue-500/10 border-t border-blue-500/20 text-center">
          <p className="text-xs text-blue-400 font-semibold animate-pulse">⏱ Otomatik silme: {autoDeleteMinutes} dk (kalan: {countdownText})</p>
        </div>
      )}
      {chatEnabled && showEmoji && (
        <div className="px-3 py-2 border-t border-border flex flex-wrap gap-1">
          {EMOJIS.map((e) => <button key={e} onClick={() => setText((t) => t + e)} className="text-xl hover:bg-secondary rounded p-1">{e}</button>)}
        </div>
      )}
      {chatEnabled && <form onSubmit={send} className="p-3 border-t border-border flex items-center gap-2">
        <label className="p-2 rounded-lg hover:bg-secondary cursor-pointer">
          <ImageIcon className="w-5 h-5" />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhoto} disabled={uploading} />
        </label>
        <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg hover:bg-secondary"><Smile className="w-5 h-5" /></button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yazın..." className="flex-1 bg-secondary/60 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" disabled={!text.trim() || uploading} className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="w-4 h-4" /></button>
        {uploading && <span className="text-xs text-muted-foreground animate-pulse shrink-0">...</span>}
      </form>}

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
            <div className="flex items-center gap-2 mb-2">
              {userMenu.userAvatar ? <Image src={userMenu.userAvatar} className="w-9 h-9 rounded-full" fittingType="fill" /> : <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{(userMenu.userName || '?')[0]}</div>}
              <p className="font-semibold">{userMenu.userName}</p>
            </div>
            <Link to={`/kullanici/${userMenu.userId}`} onClick={() => setUserMenu(null)} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm">Profili Gör</Link>
            <button onClick={() => { setReportTarget(userMenu); setUserMenu(null); }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive text-sm font-semibold">Şikayet Et</button>
            {isOwner && userMenu.userId !== user?.id && <button onClick={kickFromRoom} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-amber-500/10 text-amber-500 text-sm font-semibold">Odadan At</button>}
            {userMenu.userId !== user?.id && <button onClick={personalBlock} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 text-sm font-semibold">Engelle</button>}
            {isAdmin && <>
              {menuProfile?.member_id && <button onClick={copyMemberId} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm">Üye No Kopyala ({menuProfile.member_id})</button>}
              <button onClick={blockUser} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-amber-500/10 text-amber-500 text-sm font-semibold">Engelle</button>
              <button onClick={deleteUser} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive text-sm font-semibold">Sil</button>
            </>}
          </div>
        </div>
      )}
      {reportTarget && <ReportDialog targetId={reportTarget.userId} targetName={reportTarget.userName} context="room" contextId={roomId} onClose={() => setReportTarget(null)} />}
      {lightbox && <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4"><button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button><Image src={lightbox} className="max-w-full max-h-full rounded-lg" fittingType="fit" /></div>}
    </div>
  );
}