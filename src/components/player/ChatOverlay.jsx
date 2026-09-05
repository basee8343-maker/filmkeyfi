import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, X, Smile, Trash2, MessageSquareOff, Image as ImageIcon, MessagesSquare, Shield, Crown, Sparkles } from 'lucide-react';
import VoiceControls from '@/components/player/VoiceControls';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';

import useMessageProfiles from '@/hooks/useMessageProfiles';
import { mergeMessages, upsertMessage } from '@/lib/realtimeMessages';
import { parseRoleMetadata, parseFrameMetadata } from '@/lib/roles';
import RoomChatMessage from '@/components/player/RoomChatMessage';
import EmojiPicker from '@/components/player/EmojiPicker';
import RoomSettingsContent from '@/components/player/RoomSettingsContent';
import ParticipantHistoryPanel from '@/components/player/ParticipantHistoryPanel';
import useRoomLevels from '@/hooks/useRoomLevels';


const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '👏', '😱', '😢', '🎬', '🍿', '❤️', '🎉'];

export default function ChatOverlay({ roomId, chatEnabled, isOwner, isAdmin, onClose, autoDeleteMinutes = 0, countdownText = '', onSetAutoDelete, voice, voiceEnabled, onSettings, onDirect, onDirectUser, directUnread = 0, ownerId, roomModerators = [], participants = [], recentParticipants = [], viewerProfiles = {}, presenceMap = {}, onProfileCard, settingsProps, onToggleChat }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [lightbox, setLightbox] = useState(null);
  const [showAutoDeleteMenu, setShowAutoDeleteMenu] = useState(false);
  const [msgFilter, setMsgFilter] = useState('all');
  const [blockedUsers, setBlockedUsers] = useState(user?.blocked_users || []);
  useEffect(() => { setBlockedUsers(user?.blocked_users || []); }, [user?.blocked_users]);
  const levelUserIds = [...messages.map((message) => message.user_id), ...participants.map((participant) => participant.user_id), ...recentParticipants.map((participant) => participant.user_id)];
  const { levels: roomLevels } = useRoomLevels(levelUserIds);
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
      <div ref={scrollRef} className="flex min-w-0 flex-1 min-h-0 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain p-3 bg-black" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
        {loading ? <p className="text-center text-sm text-[#888] py-8">Yükleniyor...</p> :
         messages.length === 0 ? <p className="text-center text-sm text-[#888] py-8">Henüz mesaj yok. İlk mesajı sen at! 🍿</p> :
         messages.filter((m) => m.type === 'system' || !blockedUsers.includes(m.user_id)).filter((m) => { if (m.type === 'system') { const lower = (m.text || '').toLowerCase(); const frame = parseFrameMetadata(m.text); const hasRoleEntry = !!frame.frameId || parseRoleMetadata(frame.rest).hasRole; if (lower.includes('katıldı')) return hasRoleEntry; if (lower.includes('ayrıldı') || lower.includes('moderatör')) return false; } return true; }).map((m) => (
            <div key={m.id} className={`flex w-full min-w-0 shrink-0 gap-2 group ${m.type === 'system' ? 'justify-center' : ''}`}>
              {m.type === 'system' ? (
                (() => {
                  const frame = parseFrameMetadata(m.text);
                  const { text: cleanText, color: roleColor, hasRole } = parseRoleMetadata(frame.rest);
                  const color = roleColor || frame.textColor || '#8b5cf6';
                  const isRole = hasRole || !!frame.frameId;
                  return (
                    <span
                      className={`min-w-0 max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] text-xs px-3 py-1.5 rounded-full ${isRole ? 'font-bold neon-entrance' : 'text-[#888] bg-[#1a1a1a]'}`}
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
                <RoomChatMessage message={m} profile={profiles[m.user_id]} level={roomLevels[m.user_id]} ownerId={ownerId} roomModerators={roomModerators} currentUserId={user?.id} canDelete={isOwner || user?.id === m.user_id} onDelete={del} onImage={setLightbox} onOpenProfile={onProfileCard} />
              )}
            </div>
          ))}
          </div>
          ) : msgFilter === 'izleyici' ? (
          <ParticipantHistoryPanel participants={participants} recentParticipants={recentParticipants} profiles={viewerProfiles} presenceMap={presenceMap} roomLevels={roomLevels} ownerId={ownerId} onSelect={onProfileCard} />
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
      {chatEnabled && msgFilter === 'all' && <div className="p-2.5 border-t border-white/10 flex items-center gap-2 bg-black">
        <label className="p-2 rounded-lg hover:bg-white/10 cursor-pointer text-white">
          <ImageIcon className="w-5 h-5" />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" tabIndex={-1} aria-hidden="true" onChange={onPhoto} disabled={uploading} />
        </label>
        <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg hover:bg-white/10 text-white"><Smile className="w-5 h-5" /></button>
        <input value={text} onChange={(e) => { setText(e.target.value); sendTyping(); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }} inputMode="text" enterKeyHint="send" autoComplete="off" autoCorrect="off" autoCapitalize="sentences" spellCheck={false} placeholder="Mesaj yazın..." className="flex-1 min-w-0 bg-[#1a1a1a] rounded-full px-4 py-2 text-sm outline-none text-white placeholder:text-[#666]" />
        <button type="button" onClick={send} disabled={!text.trim() || uploading} className="p-2.5 rounded-full disabled:opacity-50" style={{ background: '#ffcc00' }}><Send className="w-4 h-4 text-black" /></button>
        {uploading && <span className="text-xs text-[#888] animate-pulse shrink-0">...</span>}
      </div>}


      {lightbox && <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4"><button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button><Image src={lightbox} className="max-w-full max-h-full rounded-lg" fittingType="fit" /></div>}
    </div>
  );
}