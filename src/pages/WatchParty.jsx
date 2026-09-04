import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VideoPlayer from '@/components/player/VideoPlayer';
import ChatOverlay from '@/components/player/ChatOverlay';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Mic, MicOff, Crown, X, Eye, ArrowLeft } from 'lucide-react';
import { Image } from '@/components/ui/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RoomSettingsMenu from '@/components/player/RoomSettingsMenu';

import LiveKitDebugPanel from '@/components/player/LiveKitDebugPanel';
import RoomDirectMessages from '@/components/player/RoomDirectMessages';
import RoomNotifications from '@/components/player/RoomNotifications';
import RoleEntrance from '@/components/player/RoleEntrance';
import MoviePickerSheet from '@/components/player/MoviePickerSheet';
import RoleBadge from '@/components/RoleBadge';
import ProfileFrame from '@/components/ProfileFrame';
import useSocialBadges from '@/hooks/useSocialBadges';
import { isModerator } from '@/lib/roles';
import { triggerBanNotice } from '@/lib/banNotice';

export default function WatchParty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: ul } = useCurrentUser();
  const { toast } = useToast();
  const [room, setRoom] = useState(null);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [moviePickerOpen, setMoviePickerOpen] = useState(false);
  const [needPassword, setNeedPassword] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwSetInput, setPwSetInput] = useState('');
  const [showPwSet, setShowPwSet] = useState(false);
  const [showPwRemoveConfirm, setShowPwRemoveConfirm] = useState(false);
  const [syncState, setSyncState] = useState({ is_playing: false, current_time: 0, last_sync: null });
  const [unread, setUnread] = useState(0);
  const [viewerProfiles, setViewerProfiles] = useState({});
  const [joinCount, setJoinCount] = useState(0);
  const [joinError, setJoinError] = useState('');
  const [voiceReady, setVoiceReady] = useState(false);
  const joinedRef = useRef(false);
  const ghostRef = useRef(false);
  const kickedRef = useRef(false);
  const lastUpdateRef = useRef(0);
  const lastSyncRef = useRef({ is_playing: false, current_time: 0 });
  const prevMovieIdRef = useRef(null);
  const playerWrapRef = useRef(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const seenRoomMessagesRef = useRef(new Set());
  const voice = useVoiceChat({ roomId: id, user, participants: room?.participants, voiceEnabled: !!room?.voice_enabled && voiceReady });
  const { messages: directUnread } = useSocialBadges(user?.id);
  const [dmNotif, setDmNotif] = useState(null);
  const [dmNotifLeaving, setDmNotifLeaving] = useState(false);
  const dmNotifTimer = useRef(null);
  const directOpenRef = useRef(false);
  useEffect(() => { directOpenRef.current = directOpen; }, [directOpen]);
  const [countdownText, setCountdownText] = useState('');
  const [autoDeleteMinutes, setAutoDeleteMinutes] = useState(0);

  useEffect(() => {
    base44.functions.invoke('room-presence', { action: 'get', room_id: id })
      .then((res) => {
        const r = res.data?.room;
        if (!r) { setLoading(false); return; }
        setRoom(r);
        setSyncState({ is_playing: r.is_playing, current_time: r.current_time, last_sync: r.last_sync });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Film değiştiğinde yeni filmi yükle (ilk yükleme dahil)
  useEffect(() => {
  if (!room?.movie_id || prevMovieIdRef.current === room.movie_id) return;
  prevMovieIdRef.current = room.movie_id;
  base44.entities.Movie.get(room.movie_id).then(setMovie).catch(() => {});
  }, [room?.movie_id]);

  useEffect(() => {
    if (!user || !room || joinedRef.current) return;
    if (room.password && room.owner_id !== user.id && !isModerator(user) && !room.participants?.some((p) => p.user_id === user.id)) {
      setNeedPassword(true);
      return;
    }
    base44.functions.invoke('room-presence', { action: 'join', room_id: id })
      .then((res) => {
        joinedRef.current = true;
        setVoiceReady(true);
        setJoinCount((c) => c + 1);
        if (res.data?.ghost) ghostRef.current = true;
      })
      .catch((e) => {
        const message = e.response?.data?.error || e.message;
        setJoinError(message);
        toast({ title: 'Katılım başarısız', description: message, variant: 'destructive' });
      });
  }, [user?.id, room?.id]);

  const submitPassword = async () => {
    try {
      await base44.functions.invoke('room-presence', { action: 'join', room_id: id, password: pwInput });
      joinedRef.current = true; setVoiceReady(true); setNeedPassword(false); setPwInput('');
    } catch (e) {
      toast({ title: 'Hatalı şifre', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    const unsub = base44.entities.Room.subscribe((ev) => {
      if (ev.type === 'update' && ev.data?.id === id) {
        setRoom((current) => ({ ...current, ...ev.data }));
        const playingChanged = ev.data.is_playing !== lastSyncRef.current.is_playing;
        const timeChanged = Math.abs((ev.data.current_time || 0) - lastSyncRef.current.current_time) > 3;
        if (playingChanged || timeChanged) {
          lastSyncRef.current = { is_playing: ev.data.is_playing, current_time: ev.data.current_time };
          setSyncState({ is_playing: ev.data.is_playing, current_time: ev.data.current_time, last_sync: ev.data.last_sync });
        }
      }
    });
    return unsub;
  }, [id]);

  // Sohbet kapalıyken realtime okunmamış sayacı; bağlantı dönünce kaçan mesajları tamamlar.
  useEffect(() => {
    if (chatOpen) { setUnread(0); return; }
    seenRoomMessagesRef.current = new Set();
    const syncMessages = async (countMissed = false) => {
      const items = await base44.entities.RoomMessage.filter({ room_id: id }, 'created_date', 500).catch(() => []);
      let missed = 0;
      items.forEach((message) => {
        if (countMissed && !seenRoomMessagesRef.current.has(message.id) && message.type !== 'system' && message.user_id !== user?.id) missed += 1;
        seenRoomMessagesRef.current.add(message.id);
      });
      if (missed) setUnread((current) => current + missed);
    };
    syncMessages(false);
    const unsub = base44.entities.RoomMessage.subscribe((event) => {
      const message = event.data;
      if (event.type !== 'create' || message?.room_id !== id || message.type === 'system' || message.user_id === user?.id || seenRoomMessagesRef.current.has(message.id)) return;
      seenRoomMessagesRef.current.add(message.id);
      setUnread((current) => current + 1);
    });
    const reconnect = () => syncMessages(true);
    window.addEventListener('online', reconnect);
    return () => { unsub(); window.removeEventListener('online', reconnect); };
  }, [chatOpen, id, user?.id]);

  // Atılma tespiti: katılımcı listesinden çıkarıldıysa yönlendir
  useEffect(() => {
    if (!user || !joinedRef.current || !room || room.owner_id === user.id || isMod || ghostRef.current) return;
    const stillIn = (room.participants || []).some((p) => p.user_id === user.id);
    if (!stillIn && !kickedRef.current) {
      kickedRef.current = true;
      (async () => {
        try {
          const me = await base44.entities.User.get(user.id);
          if (me.role === 'banned' || me.membership_status === 'suspended') {
            triggerBanNotice('banned');
            await base44.auth.logout();
            window.location.href = '/login?banned=1';
            return;
          }
        } catch {}
        toast({ title: 'Odadan atıldınız', variant: 'destructive' });
        navigate('/');
      })();
    }
  }, [room?.participants, user?.id]);

  // İzleyici profillerini çek (gerçek avatarlar için)
  const participantIdsKey = (room?.participants || []).map((p) => p.user_id).filter(Boolean).sort().join(',');
  useEffect(() => {
    if (!participantIdsKey) return;
    const ids = participantIdsKey.split(',');
    Promise.all(ids.map((uid) => base44.functions.invoke('user-profile', { user_id: uid }).then((response) => response.data).catch(() => null)))
      .then((profiles) => {
        const map = {};
        ids.forEach((uid, i) => { if (profiles[i]) map[uid] = profiles[i]; });
        setViewerProfiles(map);
      });
  }, [participantIdsKey]);

  const leaveRoom = async () => {
    if (!user || !joinedRef.current || kickedRef.current) return;
    joinedRef.current = false;
    setVoiceReady(false);
    try { await base44.functions.invoke('room-presence', { action: 'leave', room_id: id }); } catch {}
  };
  const leaveRoomRef = useRef(() => {});
  leaveRoomRef.current = leaveRoom;

  const handleBack = async () => { await leaveRoom(); navigate(-1); };

  useEffect(() => {
    const handler = () => { leaveRoomRef.current(); };
    window.addEventListener('pagehide', handler);
    window.addEventListener('beforeunload', handler);
    return () => { leaveRoomRef.current(); window.removeEventListener('pagehide', handler); window.removeEventListener('beforeunload', handler); };
  }, []);

  // Oda içindeyken özel mesaj gelince üstte bildirim göster (sadece alıcı görür)
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      const msg = event.data;
      if (!msg || msg.recipient_id !== user.id || msg.sender_id === user.id) return;
      if (directOpenRef.current) return;
      setDmNotifLeaving(false);
      base44.functions.invoke('user-profile', { user_id: msg.sender_id })
        .then((res) => setDmNotif({ id: msg.id, name: msg.sender_name, avatar: res.data?.avatar }))
        .catch(() => setDmNotif({ id: msg.id, name: msg.sender_name, avatar: null }));
      clearTimeout(dmNotifTimer.current);
      dmNotifTimer.current = setTimeout(() => {
        setDmNotifLeaving(true);
        setTimeout(() => setDmNotif(null), 400);
      }, 5000);
    });
    return () => { unsub(); clearTimeout(dmNotifTimer.current); };
  }, [user?.id]);

  const isOwner = user?.id === room?.owner_id;
  const isMod = user?.role === 'admin' || user?.role === 'moderator';
  const canMod = isOwner || isMod;

  // Otomatik sohbet silme sayacı
  useEffect(() => {
    const minutes = room?.chat_auto_delete_minutes || 0;
    setAutoDeleteMinutes(minutes);
    if (!minutes || !room?.chat_auto_delete_at) { setCountdownText(''); return; }
    const tick = () => {
      const target = new Date(room.chat_auto_delete_at).getTime();
      const remaining = Math.max(0, target - Date.now());
      if (remaining <= 0) {
        if (canMod) {
          base44.functions.invoke('clear-room-messages', { room_id: id }).catch(() => {});
          const newTarget = new Date(Date.now() + minutes * 60000).toISOString();
          base44.entities.Room.update(id, { chat_auto_delete_at: newTarget }).catch(() => {});
        }
        setCountdownText('0:00');
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setCountdownText(`${m}:${s.toString().padStart(2, '0')}`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [room?.chat_auto_delete_minutes, room?.chat_auto_delete_at, id, canMod]);

  const setAutoDelete = async (minutes) => {
    if (!canMod) return;
    try {
      const updates = { chat_auto_delete_minutes: minutes };
      if (minutes > 0) updates.chat_auto_delete_at = new Date(Date.now() + minutes * 60000).toISOString();
      else updates.chat_auto_delete_at = null;
      await base44.entities.Room.update(id, updates);
    } catch (e) {
      toast({ title: 'Ayar güncellenemedi', variant: 'destructive' });
    }
  };

  const updateRoom = async (patch, immediate = false) => {
    if (!canMod) return;
    if (!immediate && Date.now() - lastUpdateRef.current < 2000) return;
    lastUpdateRef.current = Date.now();
    await base44.entities.Room.update(id, { ...patch, last_sync: new Date().toISOString() }).catch(() => {});
  };

  const onPlayPause = (playing) => updateRoom({ is_playing: playing }, true);
  const onTimeUpdate = (t) => updateRoom({ current_time: t });
  const onSeek = (t) => updateRoom({ current_time: t, is_playing: true }, true);

  const changeMovie = async (newMovie) => {
    try {
      await base44.functions.invoke('room-presence', { action: 'change-movie', room_id: id, movie_id: newMovie.id, movie_title: newMovie.title });
      toast({ title: 'Film değiştirildi', description: newMovie.title });
    } catch (e) {
      toast({ title: 'Değiştirilemedi', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const toggleVoice = async () => {
    if (!canMod) { toast({ title: 'Yetkiniz yok', variant: 'destructive' }); return; }
    try { await base44.functions.invoke('room-presence', { action: 'toggle-voice', room_id: id }); toast({ title: room.voice_enabled ? 'Sesli sohbet kapatıldı' : 'Sesli sohbet açıldı' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const toggleChat = async () => {
    if (!canMod) { toast({ title: 'Yetkiniz yok', variant: 'destructive' }); return; }
    try { await base44.functions.invoke('room-presence', { action: 'toggle-chat', room_id: id }); toast({ title: room.chat_enabled ? 'Sohbet kapatıldı' : 'Sohbet açıldı' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const toggleMuteUser = async (uid) => {
    if (!canMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'toggle-mute', room_id: id, target_id: uid }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const toggleHidden = async () => {
    if (!canMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'toggle-hidden', room_id: id }); toast({ title: room.hidden ? 'Oda artık görünür' : 'Oda gizlendi' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const savePassword = async (override) => {
    if (!canMod) return;
    const pw = (override !== undefined ? override : pwSetInput).trim();
    try {
      await base44.functions.invoke('room-presence', { action: 'set-password', room_id: id, password: pw });
      toast({ title: pw ? 'Oda şifresi güncellendi' : 'Oda şifresi kaldırıldı' });
      setShowPwSet(false); setPwSetInput('');
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const removeUser = async (uid) => {
    if (!canMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'ban', room_id: id, target_id: uid }); toast({ title: 'Kullanıcı odadan atıldı ve geri girişi engellendi' }); }
    catch (e) { toast({ title: 'Çıkarılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
    setShowViewers(false);
  };

  const banUser = async (uid) => {
    if (!canMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'ban', room_id: id, target_id: uid }); toast({ title: 'Kullanıcı yasaklandı' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
    setShowViewers(false);
  };

  const unbanUser = async (uid) => {
    if (!canMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'unban', room_id: id, target_id: uid }); toast({ title: 'Yasak kaldırıldı' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const onTouchStart = (e) => { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (canMod && dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      setMoviePickerOpen(true);
      return;
    }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) setChatOpen(true);
      else setChatOpen(false);
    }
  };

  if (ul || loading) return <div className="h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!room) return <div className="p-6">Oda bulunamadı.</div>;
  if (room.status === 'closed') return <div className="p-10 text-center"><p className="text-xl font-bold mb-2">Oda kapatıldı</p><Link to="/" className="text-primary">Ana sayfaya dön</Link></div>;
  if (!membershipActive(user)) return <div className="p-10 text-center"><p className="mb-4">Watch Party için aktif üyelik gerekli.</p><Link to="/profil" className="text-primary">Üyeliğim</Link></div>;
  if (joinError) return <div className="fixed inset-0 bg-black flex items-center justify-center p-6"><div className="bg-card border border-border rounded-xl p-5 w-full max-w-xs text-center"><h2 className="font-bold mb-2">Odaya katılamadınız</h2><p className="text-sm text-muted-foreground mb-4">{joinError}</p><button onClick={() => navigate(-1)} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold">Geri Dön</button></div></div>;

  if (needPassword) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6">
        <div className="bg-card border border-border rounded-xl p-5 w-full max-w-xs">
          <h2 className="font-bold mb-1">Şifreli Oda</h2>
          <p className="text-sm text-muted-foreground mb-3">Bu oda şifre korumalı. Katılmak için şifreyi girin.</p>
          <input value={pwInput} onChange={(e) => setPwInput(e.target.value)} type="password" placeholder="Oda şifresi" className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring mb-3" />
          <div className="flex gap-2">
            <button onClick={() => navigate(-1)} className="flex-1 bg-secondary py-2 rounded-lg text-sm">Geri</button>
            <button onClick={submitPassword} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold">Katıl</button>
          </div>
        </div>
      </div>
    );
  }

  const src = movie?.video_url || movie?.hls_url || movie?.external_url || '';
  const chatEnabled = room.chat_enabled;
  const visibleParticipants = (room.participants || []).filter((participant) => participant.user_id === room.owner_id || viewerProfiles[participant.user_id]?.role !== 'admin');

  return (
    <div className="fixed inset-x-0 top-0 h-screen h-[100dvh] bg-black flex flex-col overflow-hidden" style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}>
      {/* Tam ekran video + alt kontrol alanı */}
      <div ref={playerWrapRef} className="flex-1 flex min-h-0 relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <RoomNotifications participants={room?.participants || []} currentUserId={user?.id} />
        <RoleEntrance roomId={id} joinTrigger={joinCount} />
        {dmNotif && (
          <div onClick={() => { setDirectOpen(true); setDmNotif(null); clearTimeout(dmNotifTimer.current); }} className={`absolute top-[max(env(safe-area-inset-top),3.5rem)] left-3 z-[65] flex items-center gap-2 rounded-xl bg-card/95 border border-border px-3 py-2 shadow-2xl backdrop-blur-xl max-w-[70%] cursor-pointer ${dmNotifLeaving ? 'dm-notif-out' : 'dm-notif-in'}`}>
            {dmNotif.avatar ? <Image src={dmNotif.avatar} className="w-8 h-8 rounded-full" fittingType="fill" /> : <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">{dmNotif.name?.[0]}</div>}
            <div className="min-w-0"><p className="text-xs font-bold truncate">{dmNotif.name}</p><p className="text-[10px] text-muted-foreground">mesaj yazdı</p></div>
          </div>
        )}
        <div className="absolute top-[max(env(safe-area-inset-top),0.75rem)] left-3 z-[55] flex items-center gap-2">
          <button onClick={handleBack} className="flex items-center justify-center w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 active:scale-95 transition"><ArrowLeft className="w-5 h-5" /></button>
          {room?.room_number ? <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1.5 rounded-full border border-white/10 whitespace-nowrap">Oda No: {room.room_number}</span> : null}
        </div>
        <button onClick={() => { setShowViewers(!showViewers); setShowSettings(false); }} className={`absolute top-[max(env(safe-area-inset-top),0.75rem)] right-3 z-[55] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white border border-white/10 backdrop-blur-md transition active:scale-95 ${showViewers ? 'bg-primary/80' : 'bg-black/60'}`}><Eye className="w-4 h-4" /><span>{visibleParticipants.length}</span></button>
        <div className={`flex items-center justify-center bg-black ${chatOpen ? 'flex-1 min-w-0' : 'flex-1 min-w-0'}`}>
          {src ? <VideoPlayer src={src} title={room.movie_title} syncState={syncState} isOwner={canMod} isTimeSource={isOwner} onPlayPause={onPlayPause} onTimeUpdate={onTimeUpdate} onSeek={onSeek} onEnded={() => setMoviePickerOpen(true)} fullscreenRef={playerWrapRef} watermark={user} controlsRaised /> :
            <div className="text-muted-foreground text-sm p-6 text-center">Video kaynağı yok</div>}
        </div>

        {chatOpen && (
          <div className="absolute right-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] landscape:bottom-0 landscape:pt-0 z-40 flex w-full max-w-sm flex-col border-l border-border bg-card/95 pt-[max(env(safe-area-inset-top),0.75rem)] shadow-2xl backdrop-blur-xl">
            <ChatOverlay roomId={id} chatEnabled={chatEnabled} isOwner={canMod} isAdmin={isMod} onClose={() => setChatOpen(false)} autoDeleteMinutes={autoDeleteMinutes} countdownText={countdownText} onSetAutoDelete={setAutoDelete} voice={voice} voiceEnabled={room.voice_enabled} onSettings={() => { setShowSettings(!showSettings); setShowViewers(false); }} onDirect={() => { setDirectOpen(!directOpen); setChatOpen(false); setShowViewers(false); setShowSettings(false); }} directUnread={directUnread} />
          </div>
        )}

        {directOpen && <div className="absolute inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[70]"><RoomDirectMessages onClose={() => setDirectOpen(false)} /></div>}

        {showViewers && (
          <div className="absolute bottom-24 right-3 bg-card/95 border border-border rounded-xl p-3 z-[60] w-56 max-h-[65%] overflow-y-auto shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm">İzleyiciler</p>
              <button onClick={() => setShowViewers(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1.5">
              {visibleParticipants.map((p) => {
                const prof = viewerProfiles[p.user_id];
                const avatar = p.avatar || prof?.avatar;
                const speaking = p.user_id === user.id ? voice.localSpeaking : voice.speakingIds.includes(p.user_id);
                const micActive = voice.participantMicStates[p.user_id] ?? false;
                return (
                  <div key={p.user_id} className="flex items-center gap-2 text-sm">
                    <Link to={`/kullanici/${p.user_id}`} className="shrink-0">
                      {prof?.profile_frame ? (
                        <ProfileFrame frame={prof.profile_frame} size="sm" avatar={avatar} name={p.name} />
                      ) : (
                        avatar ? <Image src={avatar} className={`w-7 h-7 rounded-full object-cover ${speaking ? 'speaking-glow' : ''}`} fittingType="fill" /> : <span className={`w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold ${speaking ? 'speaking-glow' : ''}`}>{(p.name || '?')[0]}</span>
                      )}
                    </Link>
                    <Link to={`/kullanici/${p.user_id}`} className="flex-1 truncate hover:underline">{p.name}{p.user_id === room.owner_id && <Crown className="w-3 h-3 text-amber-400 inline ml-1" />}</Link>
                    {(viewerProfiles[p.user_id]?.display_role || viewerProfiles[p.user_id]?.custom_role?.name) && <RoleBadge user={viewerProfiles[p.user_id]} size="sm" showLabel={false} />}
                    {micActive ? <Mic className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    {canMod && p.user_id !== user.id && room.voice_enabled && (
                      <button onClick={() => toggleMuteUser(p.user_id)} className={`p-1 rounded shrink-0 ${p.muted ? 'text-red-400' : 'text-green-400'}`} title={p.muted ? 'Mikrofonu aç' : 'Mikrofonu kapat'}>
                        {p.muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {canMod && p.user_id !== user.id && <button onClick={() => banUser(p.user_id)} className="text-xs text-red-400 shrink-0">Yasakla</button>}
                    {canMod && p.user_id !== user.id && <button onClick={() => removeUser(p.user_id)} className="text-xs text-destructive shrink-0">Çıkar</button>}
                  </div>
                );
              })}
            </div>

          </div>
        )}
        <RoomSettingsMenu open={showSettings} onClose={() => setShowSettings(false)} room={room} canMod={canMod} password={pwSetInput} setPassword={setPwSetInput} passwordOpen={showPwSet} setPasswordOpen={setShowPwSet} onVoice={toggleVoice} onChat={toggleChat} onHidden={toggleHidden} onPassword={() => savePassword()} onRemovePassword={() => setShowPwRemoveConfirm(true)} onUnban={unbanUser} onPickMovie={() => { setMoviePickerOpen(true); setShowSettings(false); }} />
      </div>

      <LiveKitDebugPanel voice={voice} />

      <ConfirmDialog
        open={showPwRemoveConfirm}
        onOpenChange={setShowPwRemoveConfirm}
        title="Şifre kaldırılsın mı?"
        description="Oda şifresini kaldırırsanız oda herkese açık hale gelir."
        confirmText="Kaldır"
        onConfirm={() => savePassword('')}
      />
      <MoviePickerSheet open={moviePickerOpen} onClose={() => setMoviePickerOpen(false)} onSelect={changeMovie} currentMovieId={movie?.id} />
    </div>
  );
}