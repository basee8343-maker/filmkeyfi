import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, X, Smile, Trash2, MessageSquareOff, Image as ImageIcon, MessagesSquare, Shield, Crown, Sparkles } from 'lucide-react';
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
import UserProfileCard from '@/components/player/UserProfileCard';
import EmojiPicker from '@/components/player/EmojiPicker';
import RoomSettingsContent from '@/components/player/RoomSettingsContent';

const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '👏', '😱', '😢', '🎬', '🍿', '❤️', '🎉'];

export default function ChatOverlay({ roomId, chatEnabled, isOwner, isAdmin, onClose, autoDeleteMinutes = 0, countdownText = '', onSetAutoDelete, voice, voiceEnabled, onSettings, onDirect, onDirectUser, directUnread = 0, ownerId, roomModerators = [], participants = [], viewerProfiles = {}, presenceMap = {}, onProfileCard, settingsProps, onToggleChat }) {
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
  const [msgFilter, setMsgFilter] = useState('all');
  const [blockedUsers, setBlockedUsers] = useState(user?.blocked_users || []);
  useEffect(() => { setBlockedUsers(user?.blocked_users || []); }, [user?.blocked_users]);
  const [roomLevels, setRoomLevels] = useState({});
  useEffect(() => {
    if (!ownerId) return;
    base44.entities.RoomLevel.filter({ owner_id: ownerId }, 'created_date', 100)
      .then((levels) => { const map = {}; levels.forEach((l) => { map[l.user_id] = l.level; }); setRoomLevels(map); })
      .catch(() => {});
    const unsub = base44.entities.RoomLevel.subscribe((ev) => {
      if (ev.data?.owner_id !== ownerId) return;
      setRoomLevels((prev) => ({ ...prev, [ev.data.user_id]: ev.data.level }));
    });
    return unsub;
  }, [ownerId]);
  const scrollRef = useRef(null);
  const profiles = useMessageProfiles(messages.map((message) => message.user_id));
  const [roomMods, setRoomMods] = useState([]);
  useEffect(() => {
    if (!ownerId) return;
    base44.entities.RoomMod.filter({ owner_id: ownerId }, 'created_date', 100)
      .then((mods) => setRoomMods(mods))
      .catch(() => {});
    const unsub = base44.entities.RoomMod.subscribe((ev) => {
      if (ev.data?.owner_id !== ownerId) return;
      base44.entities.RoomMod.filter({ owner_id: ownerId }, 'created_date', 100)
        .then((mods) => setRoomMods(mods))
        .catch(() => {});
    });
    return unsub;
  }, [ownerId]);
  const [joinRequests, setJoinRequests] = useState([]);
  useEffect(() => {
    if (!roomId || !isOwner) return;
    const load = () => {
      base44.entities.RoomJoinRequest.filter({ room_id: roomId, status: 'pending' }, '-created_date', 50)
        .then((reqs) => setJoinRequests(reqs))
        .catch(() => {});
    };
    load();
    const unsub = base44.entities.RoomJoinRequest.subscribe((ev) => {
      if (ev.data?.room_id !== roomId) return;
      load();
    });
    return unsub;
  }, [roomId, isOwner]);

  const [typingUsers, setTypingUsers] = useState([]);
  const myTypingIdRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    const refresh = () => {
      base44.entities.RoomTyping.filter({ room_id: roomId }, '-updated_date', 50)
        .then((records) => {
          const now = Date.now();
          const active = records
            .filter((r) => r.user_id !== user?.id && now - new Date(r.updated_at || r.created_date).getTime() < 3000)
            .map((r) => r.user_name);
          setTypingUsers([...new Set(active)]);
        })
        .catch(() => {});
    };
    refresh();
    const unsub = base44.entities.RoomTyping.subscribe((ev) => { if (ev.data?.room_id === roomId) refresh(); });
    const poll = setInterval(refresh, 1000);
    return () => { unsub(); clearInterval(poll); if (myTypingIdRef.current) { base44.entities.RoomTyping.delete(myTypingIdRef.current).catch(() => {}); myTypingIdRef.current = null; } };
  }, [roomId, user?.id]);

  const sendTyping = () => {
    if (!user || !roomId) return;
    const updateOrCreate = async () => {
      try {
        if (myTypingIdRef.current) {
          await base44.entities.RoomTyping.update(myTypingIdRef.current, { updated_at: new Date().toISOString() });
        } else {
          const rec = await base44.entities.RoomTyping.create({ room_id: roomId, user_id: user.id, user_name: user.username || user.full_name || 'Kullanıcı', updated_at: new Date().toISOString() });
          myTypingIdRef.current = rec.id;
        }
      } catch {
        try {
          const rec = await base44.entities.RoomTyping.create({ room_id: roomId, user_id: user.id, user_name: user.username || user.full_name || 'Kullanıcı', updated_at: new Date().toISOString() });
          myTypingIdRef.current = rec.id;
        } catch {}
      }
    };
    updateOrCreate();
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (myTypingIdRef.current) {
        base44.entities.RoomTyping.delete(myTypingIdRef.current).catch(() => {});
        myTypingIdRef.current = null;
      }
    }, 3000);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const load = () => {
    base44.entities.RoomMessage.filter({ room_id: roomId }, 'created_date', 200)
      .then((r) => { setMessages((current) => mergeMessages(current, r)); setLoading(false); setTimeout(scrollToBottom, 100); })
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
    <div className="h-full min-h-0 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 gap-1.5">
        <h3 className="font-bold flex items-center gap-1.5 text-white">💬 Sohbet {chatEnabled && <span className="text-xs text-[#888] font-normal">({messages.length})</span>}</h3>
        <div className="flex items-center gap-1.5">
          {isOwner && chatEnabled && (
            <div className="relative">
              <button onClick={() => setShowAutoDeleteMenu(!showAutoDeleteMenu)} className="px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 204, 0, 0.15)', color: '#ffcc00' }}>⏱ Oto-sil: {autoDeleteMinutes ? `${autoDeleteMinutes}dk` : 'Kapalı'}</button>
              {showAutoDeleteMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl p-2 w-36">
                  <p className="text-xs text-[#888] mb-1.5 text-center">Otomatik Silme Süresi</p>
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => { onSetAutoDelete?.(0); setShowAutoDeleteMenu(false); }} className={`px-1.5 py-1 rounded text-xs font-semibold ${!autoDeleteMinutes ? 'text-[#ffcc00]' : 'text-[#888] hover:bg-white/5'}`} style={!autoDeleteMinutes ? { background: 'rgba(255, 204, 0, 0.15)' } : {}}>Kapalı</button>
                    {[2,3,4,5,6,7,8,9,10].map((m) => (
                      <button key={m} onClick={() => { onSetAutoDelete?.(m); setShowAutoDeleteMenu(false); }} className={`px-1.5 py-1 rounded text-xs font-semibold ${autoDeleteMinutes === m ? 'text-[#ffcc00]' : 'text-[#888] hover:bg-white/5'}`} style={autoDeleteMinutes === m ? { background: 'rgba(255, 204, 0, 0.15)' } : {}}>{m}dk</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
        </div>
      </div>
      {(voiceEnabled || onSettings || onDirect) && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
          <VoiceControls voice={voice} />
          {onDirect && <button onClick={onDirect} className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] text-xs font-semibold hover:bg-[#2a2a2a] whitespace-nowrap text-white"><MessagesSquare className="w-4 h-4" /> Mesaj{directUnread > 0 && <span className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full px-1 text-[9px] font-bold text-white flex items-center justify-center" style={{ background: '#ffcc00', color: '#000' }}>{directUnread > 99 ? '99+' : directUnread}</span>}</button>}
        </div>
      )}
      {(chatEnabled || isOwner) && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-[#0d0d0d] overflow-x-auto no-scrollbar" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          {['all', 'yetkililer', 'izleyici', 'yonetici', ...(isOwner ? ['istekler'] : [])].map((f) => (
            <button key={f} onClick={() => setMsgFilter(f)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${msgFilter === f ? 'text-[#ffcc00]' : 'text-[#888] hover:text-white'}`} style={msgFilter === f ? { borderBottom: '2px solid #ffcc00', background: 'rgba(255, 204, 0, 0.08)' } : {}}>
              {f === 'all' ? 'Tümü' : f === 'yetkililer' ? 'Yetkililer' : f === 'izleyici' ? 'İzleyici' : f === 'istekler' ? `İstekler${joinRequests.length > 0 ? ` (${joinRequests.length})` : ''}` : 'Yönetici'}
            </button>
          ))}
          {isOwner && <button onClick={clearAll} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-[#ffcc00] hover:bg-white/5 shrink-0"><Sparkles className="w-3 h-3" /> Temizle</button>}
        </div>
      )}
      {!chatEnabled && msgFilter === 'all' ? (
        isOwner ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-6 bg-black">
            <MessageSquareOff className="w-10 h-10 mb-3 text-[#888]" />
            <p className="font-semibold text-white mb-3">Sohbet kapalı</p>
            <button onClick={onToggleChat} className="px-5 py-2.5 rounded-xl text-sm font-bold text-black" style={{ background: '#ffcc00' }}>Sohbeti Aç</button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-6 text-[#888] bg-black">
            <MessageSquareOff className="w-10 h-10 mb-3" />
            <p className="font-semibold text-white">Sohbet kapalı</p>
            <p className="text-sm">Oda sahibi sohbeti kapatmış.</p>
          </div>
        )
      ) : msgFilter === 'all' ? (
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2 bg-black" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
        {loading ? <p className="text-center text-sm text-[#888] py-8">Yükleniyor...</p> :
         messages.length === 0 ? <p className="text-center text-sm text-[#888] py-8">Henüz mesaj yok. İlk mesajı sen at! 🍿</p> :
         messages.filter((m) => m.type === 'system' || !blockedUsers.includes(m.user_id)).filter((m) => { if (m.type === 'system') { const lower = (m.text || '').toLowerCase(); if (lower.includes('katıldı') || lower.includes('ayrıldı') || lower.includes('moderatör')) return false; } return true; }).map((m) => (
            <div key={m.id} className={`flex gap-2 group ${m.type === 'system' ? 'justify-center' : ''}`}>
              {m.type === 'system' ? (
                (() => {
                  const { text: cleanText, color, hasRole } = parseRoleMetadata(m.text);
                  const isRole = hasRole && /^\p{Extended_Pictographic}/u.test(cleanText);
                  return (
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full ${isRole ? 'font-bold neon-entrance' : 'text-[#888] bg-[#1a1a1a]'}`}
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
                     {roomLevels[m.user_id] && <span className="text-[10px] font-bold text-blue-400 shrink-0">Lv{roomLevels[m.user_id]}</span>}
                     {profiles[m.user_id] && (profiles[m.user_id].display_role || profiles[m.user_id].custom_role?.name) && <RoleBadge user={profiles[m.user_id]} size="sm" showLabel={false} />}
                   </div>
                   <RoleMessageEffect roleKey={profiles[m.user_id]?.display_role || (profiles[m.user_id]?.custom_role?.name ? 'custom' : '')} msgEffect={getRoleInfo(profiles[m.user_id] || m)?.msg_effect} msgColor={getRoleInfo(profiles[m.user_id] || m)?.color}>
                      {m.file_url && <Image src={m.file_url} alt="foto" className="rounded-lg max-w-[180px] max-h-44 object-cover mb-1 cursor-pointer block" fittingType="fit" onClick={() => setLightbox(m.file_url)} />}
                      {m.text && (() => { const trimmed = m.text.trim(); const animEmojis = ['😂','❤️','🔥','👏','🎉','😍','😱','😢','👍','🍿','🎬','💀']; if (animEmojis.includes(trimmed) && trimmed.length <= 3) { const ac = ['😂','👏','😢','👍'].includes(trimmed) ? 'anim-emoji-bounce' : ['❤️','🎉','😍','🍿'].includes(trimmed) ? 'anim-emoji-pulse' : 'anim-emoji-shake'; return <span className={`text-3xl inline-block anim-emoji ${ac}`}>{trimmed}</span>; } return <p className="text-sm break-words rounded-lg px-2.5 py-1.5 inline-block text-white" style={{ background: 'rgba(26, 26, 26, 0.9)', border: '1px solid rgba(255, 204, 0, 0.2)', borderLeft: '2px solid #ffcc00', borderBottom: '2px solid #ffcc00' }}>{m.text}</p>; })()}
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
          ) : msgFilter === 'izleyici' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 bg-black">
          {participants.length === 0 ? <p className="text-center text-sm text-[#888] py-8">İzleyici yok</p> :
          participants.map((p) => {
            const prof = viewerProfiles[p.user_id];
            const avatar = p.avatar || prof?.avatar;
            const presence = presenceMap[p.user_id];
            const isOnline = presence?.online && (Date.now() - new Date(presence.last_seen).getTime() < 60000);
            return (
              <button key={p.user_id} onClick={() => onProfileCard?.(p.user_id)} className="flex items-center gap-2 w-full text-left py-1.5 hover:bg-white/5 rounded-lg px-1">
                <div className="shrink-0 relative">
                  {avatar ? <Image src={avatar} className="w-8 h-8 rounded-full object-cover" fittingType="fill" /> : <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B31FF] to-[#5F24A1] flex items-center justify-center text-xs font-bold text-white">{(p.name || '?')[0]}</span>}
                  <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-black ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
                <span className="flex-1 truncate text-sm text-white">{p.name}{p.user_id === ownerId && <Crown className="w-3 h-3 text-amber-400 inline ml-0.5" />}</span>
                {!isOnline && <span className="text-[10px] text-red-400 shrink-0">çevrim dışı</span>}
              </button>
            );
          })}
          </div>
          ) : msgFilter === 'yetkililer' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 bg-black">
          {roomMods.length === 0 ? <p className="text-center text-sm text-[#888] py-8">Henüz yetkili yok.</p> :
          roomMods.map((mod) => (
            <div key={mod.id || mod.user_id} className="flex items-center gap-2 py-1.5 px-1">
              <span className="w-8 h-8 rounded-full bg-[#8e44ad]/30 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-[#c39bd3]" />
              </span>
              <span className="flex-1 truncate text-sm text-white">{mod.user_name || mod.name || 'Kullanıcı'}</span>
              <span className="text-[10px] text-[#c39bd3] font-semibold">Mod</span>
            </div>
          ))}
          </div>
          ) : msgFilter === 'istekler' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-black">
          {joinRequests.length === 0 ? <p className="text-center text-sm text-[#888] py-8">Bekleyen katılım isteği yok.</p> :
          joinRequests.map((req) => (
            <div key={req.id} className="flex items-center gap-2 p-2 rounded-xl bg-[#1a1a1a] border border-amber-400/30">
              {req.user_avatar ? <Image src={req.user_avatar} className="w-9 h-9 rounded-full object-cover shrink-0" fittingType="fill" /> : <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">{(req.user_name || '?')[0]}</div>}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate text-white">{req.user_name}</p>
                <p className="text-[10px] text-[#888]">odaya katılmak istiyor</p>
              </div>
              <button onClick={async () => { await base44.functions.invoke('room-presence', { action: 'approve-join', room_id: roomId, request_id: req.id }); toast({ title: 'İstek onaylandı' }); }} className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold whitespace-nowrap">Onayla</button>
              <button onClick={async () => { await base44.functions.invoke('room-presence', { action: 'reject-join', room_id: roomId, request_id: req.id }); toast({ title: 'İstek reddedildi' }); }} className="px-2.5 py-1.5 rounded-lg bg-red-500/80 text-white text-xs font-bold whitespace-nowrap">Reddet</button>
            </div>
          ))}
          </div>
          ) : (
          <div className="flex-1 min-h-0 overflow-y-auto bg-card/95 text-white" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
          <RoomSettingsContent {...(settingsProps || {})} />
          </div>
          )}
          {chatEnabled && msgFilter === 'all' && autoDeleteMinutes > 0 && countdownText && (
        <div className="px-3 py-1.5 border-t border-white/10 text-center" style={{ background: 'rgba(255, 204, 0, 0.08)' }}>
          <p className="text-xs font-semibold animate-pulse" style={{ color: '#ffcc00' }}>⏱ Otomatik silme: {autoDeleteMinutes} dk (kalan: {countdownText})</p>
        </div>
      )}
      {chatEnabled && msgFilter === 'all' && showEmoji && (
        <EmojiPicker onSelect={(e) => { setText((t) => t + e); setShowEmoji(false); }} />
      )}
      {chatEnabled && msgFilter === 'all' && typingUsers.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/10 bg-black">
          <p className="text-xs text-purple-400 flex items-center gap-1.5">
            <span className="flex gap-0.5 items-end">
              <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="truncate">{typingUsers.length === 1 ? `${typingUsers[0]} yazıyor...` : typingUsers.length === 2 ? `${typingUsers[0]} ve ${typingUsers[1]} yazıyor...` : `${typingUsers[0]} ve ${typingUsers.length - 1} kişi yazıyor...`}</span>
          </p>
        </div>
      )}
      {chatEnabled && msgFilter === 'all' && <form onSubmit={send} className="p-2.5 border-t border-white/10 flex items-center gap-2 bg-black">
        <label className="p-2 rounded-lg hover:bg-white/10 cursor-pointer text-white">
          <ImageIcon className="w-5 h-5" />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhoto} disabled={uploading} />
        </label>
        <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg hover:bg-white/10 text-white"><Smile className="w-5 h-5" /></button>
        <input value={text} onChange={(e) => { setText(e.target.value); sendTyping(); }} placeholder="Mesaj yazın..." className="flex-1 bg-[#1a1a1a] rounded-full px-4 py-2 text-sm outline-none text-white placeholder:text-[#666]" />
        <button type="submit" disabled={!text.trim() || uploading} className="p-2.5 rounded-full disabled:opacity-50" style={{ background: '#ffcc00' }}><Send className="w-4 h-4 text-black" /></button>
        {uploading && <span className="text-xs text-[#888] animate-pulse shrink-0">...</span>}
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
        <UserProfileCard userId={userMenu.userId} roomId={roomId} canMod={isOwner} voiceEnabled={false} onClose={() => setUserMenu(null)} onKick={kickFromRoom} onMessage={onDirectUser} />
      )}
      {reportTarget && <ReportDialog targetId={reportTarget.userId} targetName={reportTarget.userName} context="room" contextId={roomId} onClose={() => setReportTarget(null)} />}
      {lightbox && <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4"><button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button><Image src={lightbox} className="max-w-full max-h-full rounded-lg" fittingType="fit" /></div>}
    </div>
  );
}