import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VideoPlayer from '@/components/player/VideoPlayer';
import ChatOverlay from '@/components/player/ChatOverlay';
import VoiceControls from '@/components/player/VoiceControls';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Mic, MicOff, Crown, X, Eye, ArrowLeft, UserMinus, MessageSquare, Trash2, Settings, MessagesSquare } from 'lucide-react';
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
import useRoomLevels from '@/hooks/useRoomLevels';
import RoomLevelBadge from '@/components/levels/RoomLevelBadge';
import UserProfile from '@/pages/UserProfile';

export default function WatchParty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: ul } = useCurrentUser();
  const { toast } = useToast();
  const [room, setRoom] = useState(null);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const [directTarget, setDirectTarget] = useState(null);
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
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [joinRejected, setJoinRejected] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
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
  const [countdownText, setCountdownText] = useState('');
  const [autoDeleteMinutes, setAutoDeleteMinutes] = useState(0);

  const [roomNameEdit, setRoomNameEdit] = useState('');
  const profileTarget = new URLSearchParams(location.search).get('profile');
  const openUserProfile = (userId) => {
    if (!userId) return;
    const params = new URLSearchParams(location.search);
    params.set('profile', userId);
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { state: { ...(location.state || {}), roomProfileOverlay: true } });
  };
  const closeUserProfile = () => {
    if (location.state?.roomProfileOverlay) { navigate(-1); return; }
    const params = new URLSearchParams(location.search);
    params.delete('profile');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
  };
  const [presenceMap, setPresenceMap] = useState({});
  const isOwner = user?.id === room?.owner_id;
  const isMod = user?.role === 'admin' || user?.role === 'moderator';
  const canMod = isOwner || isMod || (room?.room_moderators || []).includes(user?.id);

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

  // Oda adını düzenleme alanını odadan başlat
  useEffect(() => { setRoomNameEdit(room?.name || ''); }, [room?.name]);

  // Kişisel oda: film yoksa sadece oda sahibine otomatik film seçme panelini aç
  useEffect(() => {
    if (room?.is_personal && !room?.movie_id && joinCount > 0 && user?.id === room?.owner_id) {
      setMoviePickerOpen(true);
    }
  }, [room?.is_personal, room?.movie_id, joinCount, user?.id]);

  useEffect(() => {
    if (!user || !room || joinedRef.current) return;
    if (room.password && room.owner_id !== user.id && !isModerator(user) && !room.participants?.some((p) => p.user_id === user.id)) {
      setNeedPassword(true);
      return;
    }
    // Özel oda: sahip/admin değilse onay sisteminden geç
    if (room.is_personal && room.owner_id !== user.id && !isModerator(user)) {
      base44.functions.invoke('room-presence', { action: 'request-join', room_id: id })
        .then((res) => {
          if (res.data?.approved) {
            // Onaylı istek var — normal katılıma geç
            base44.functions.invoke('room-presence', { action: 'join', room_id: id })
              .then((r) => {
                joinedRef.current = true; setVoiceReady(true);
                navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => {});
                setJoinCount((c) => c + 1);
                if (r.data?.ghost) ghostRef.current = true;
              })
              .catch((e) => { const m = e.response?.data?.error || e.message; setJoinError(m); toast({ title: 'Katılım başarısız', description: m, variant: 'destructive' }); });
          } else if (res.data?.pending) {
            setWaitingForApproval(true);
          }
        })
        .catch((e) => { const m = e.response?.data?.error || e.message; setJoinError(m); toast({ title: 'İstek gönderilemedi', description: m, variant: 'destructive' }); });
      return;
    }
    base44.functions.invoke('room-presence', { action: 'join', room_id: id })
      .then((res) => {
        joinedRef.current = true;
        setVoiceReady(true);
        navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => {});
        setJoinCount((c) => c + 1);
        if (res.data?.ghost) ghostRef.current = true;
      })
      .catch((e) => {
        const message = e.response?.data?.error || e.message;
        setJoinError(message);
        toast({ title: 'Katılım başarısız', description: message, variant: 'destructive' });
      });
  }, [user?.id, room?.id]);

  // Bekleyen isteğin durumunu izle (onay/red)
  useEffect(() => {
    if (!user || !room || !waitingForApproval) return;
    const unsub = base44.entities.RoomJoinRequest.subscribe((ev) => {
      if (ev.data?.room_id !== id || ev.data?.user_id !== user.id) return;
      if (ev.type === 'update') {
        if (ev.data.status === 'approved') {
          setWaitingForApproval(false);
          base44.functions.invoke('room-presence', { action: 'join', room_id: id })
            .then((r) => {
              joinedRef.current = true; setVoiceReady(true);
              navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => {});
              setJoinCount((c) => c + 1);
              if (r.data?.ghost) ghostRef.current = true;
            })
            .catch((e) => { const m = e.response?.data?.error || e.message; setJoinError(m); toast({ title: 'Katılım başarısız', description: m, variant: 'destructive' }); });
        } else if (ev.data.status === 'rejected') {
          setWaitingForApproval(false);
          setJoinRejected(true);
        }
      }
    });
    return unsub;
  }, [user?.id, room?.id, waitingForApproval]);

  // Oda sahibi: bekleyen katılım isteklerini izle
  useEffect(() => {
    if (!user || !room || room.owner_id !== user.id) return;
    const load = () => {
      base44.entities.RoomJoinRequest.filter({ room_id: id, status: 'pending' }, '-created_date', 50)
        .then((reqs) => setJoinRequests(reqs))
        .catch(() => {});
    };
    load();
    const unsub = base44.entities.RoomJoinRequest.subscribe((ev) => {
      if (ev.data?.room_id !== id) return;
      load();
    });
    return unsub;
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
      if (ev.type === 'delete' && (ev.data?.id === id || ev.id === id)) {
        toast({ title: 'Oda silindi', variant: 'destructive' });
        navigate('/');
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
    if (!user || !joinedRef.current || !room || room.owner_id === user.id || ghostRef.current) return;
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

  // Atılma tespiti yedeği — 3sn polling (realtime kaçırsa diye)
  useEffect(() => {
    if (!user || joinCount === 0 || !room || room.owner_id === user.id || ghostRef.current) return;
    const intervalId = setInterval(async () => {
      if (kickedRef.current) { clearInterval(intervalId); return; }
      try {
        const res = await base44.functions.invoke('room-presence', { action: 'get', room_id: id });
        const r = res.data?.room;
        if (!r) { kickedRef.current = true; clearInterval(intervalId); navigate('/'); return; }
        const stillIn = (r.participants || []).some((p) => p.user_id === user.id);
        if (!stillIn) {
          kickedRef.current = true;
          clearInterval(intervalId);
          toast({ title: 'Odadan atıldınız', variant: 'destructive' });
          navigate('/');
        }
      } catch {}
    }, 3000);
    return () => clearInterval(intervalId);
  }, [user?.id, room?.id, joinCount, isMod, ghostRef.current]);

  // İzleyici profillerini çek (gerçek avatarlar için)
  const participantIdsKey = [...(room?.participants || []), ...(room?.recent_participants || [])].map((p) => p.user_id).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).sort().join(',');
  const { levels: roomLevels } = useRoomLevels(participantIdsKey ? participantIdsKey.split(',') : []);
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

  useEffect(() => {
    if (!participantIdsKey) return;
    const ids = participantIdsKey.split(',');
    Promise.all(ids.map((uid) => base44.entities.UserPresence.filter({ user_id: uid }, '-created_date', 1).then((r) => [uid, r[0]]).catch(() => [uid, null])))
      .then((entries) => { const map = {}; entries.forEach(([uid, rec]) => { if (rec) map[uid] = rec; }); setPresenceMap(map); });
    const unsub = base44.entities.UserPresence.subscribe((ev) => {
      if (ev.type !== 'create' && ev.type !== 'update') return;
      if (!ids.includes(ev.data.user_id)) return;
      setPresenceMap((prev) => ({ ...prev, [ev.data.user_id]: ev.data }));
    });
    return unsub;
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

  useEffect(() => {
    if (!user?.id) return;
    let hiddenAt = null;
    const onVisibilityChange = async () => {
      if (!joinedRef.current) return;
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAt) {
        const awayTime = Date.now() - hiddenAt;
        hiddenAt = null;
        if (awayTime > 60000) {
          joinedRef.current = false;
          try { await base44.functions.invoke('room-presence', { action: 'leave', room_id: id }); } catch {}
          toast({ title: '1 dakikadan fazla çevrim dışı olduğunuz için odadan ayrıldınız', variant: 'destructive' });
          navigate('/');
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [user?.id, id, navigate]);

  const presenceMapRef = useRef({});
  const participantsRef = useRef([]);
  useEffect(() => { presenceMapRef.current = presenceMap; }, [presenceMap]);
  useEffect(() => { participantsRef.current = room?.participants || []; }, [room?.participants]);

  useEffect(() => {
    if (!canMod || !room?.participants) return;
    const check = async () => {
      const offlineUsers = (participantsRef.current || []).filter((p) => {
        if (p.user_id === user.id || p.user_id === room.owner_id) return false;
        const presence = presenceMapRef.current[p.user_id];
        if (!presence) return false;
        return !presence.online || (Date.now() - new Date(presence.last_seen).getTime() > 30000);
      });
      for (const u of offlineUsers) {
        await base44.functions.invoke('room-presence', { action: 'kick', room_id: id, target_id: u.user_id }).catch(() => {});
      }
    };
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [canMod, id, user?.id, room?.owner_id]);

  // Otomatik sohbet silme sayacı
  useEffect(() => {
    const minutes = room?.chat_auto_delete_minutes || 0;
    setAutoDeleteMinutes(minutes);
    if (!minutes || !room?.chat_auto_delete_at) { setCountdownText(''); return; }
    const tick = () => {
      const target = new Date(room.chat_auto_delete_at).getTime();
      const remaining = Math.max(0, target - Date.now());
      if (remaining <= 0) {
        base44.functions.invoke('clear-room-messages', { room_id: id }).catch(() => {});
        const newTarget = new Date(Date.now() + minutes * 60000).toISOString();
        base44.entities.Room.update(id, { chat_auto_delete_at: newTarget }).catch(() => {});
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

  const clearAllMessages = async () => {
    if (!canMod) return;
    if (!confirm('Sohbetin tüm mesajlarını silmek istediğinize emin misiniz?')) return;
    try { await base44.functions.invoke('clear-room-messages', { room_id: id }); toast({ title: 'Tüm mesajlar silindi' }); }
    catch (e) { toast({ title: 'Silinemedi', variant: 'destructive' }); }
  };

  const assignMod = async (uid) => {
    if (!isOwner && !isMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'assign-mod', room_id: id, target_id: uid }); toast({ title: 'Moderatör atandı' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const removeMod = async (uid) => {
    if (!isOwner && !isMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'remove-mod', room_id: id, target_id: uid }); toast({ title: 'Moderatör kaldırıldı' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const deleteRoom = async () => {
    if (!confirm('Bu odayı kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      await base44.functions.invoke('room-presence', { action: 'delete-room', room_id: id });
      toast({ title: 'Oda silindi' });
      navigate('/');
    } catch (e) {
      toast({ title: 'Silinemedi', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const saveRoomName = async () => {
    if (!canMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'set-name', room_id: id, name: roomNameEdit }); toast({ title: 'Oda adı güncellendi' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const updateRoom = useCallback(async (patch, immediate = false) => {
    if (!canMod) return;
    if (!immediate && Date.now() - lastUpdateRef.current < 2000) return;
    lastUpdateRef.current = Date.now();
    await base44.entities.Room.update(id, { ...patch, last_sync: new Date().toISOString() }).catch(() => {});
  }, [canMod, id]);

  const onPlayPause = useCallback((playing) => updateRoom({ is_playing: playing }, true), [updateRoom]);
  const onTimeUpdate = useCallback((t) => updateRoom({ current_time: t }), [updateRoom]);
  const onSeek = useCallback((t) => updateRoom({ current_time: t, is_playing: true }, true), [updateRoom]);

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

  const kickUser = async (uid) => {
    if (!canMod) return;
    try { await base44.functions.invoke('room-presence', { action: 'kick', room_id: id, target_id: uid }); toast({ title: 'Kullanıcı odadan çıkarıldı' }); }
    catch (e) { toast({ title: 'Çıkarılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
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
    if (canMod && dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.5 && !chatOpen && !showSettings && !directOpen && !showViewers) {
      setMoviePickerOpen(true);
      return;
    }
    if (Math.abs(dx) > 100 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) setChatOpen(true);
      else setChatOpen(false);
    }
  };

  if (ul || loading) return <div className="h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!room) return <div className="p-6">Oda bulunamadı.</div>;
  if (room.status === 'closed') return <div className="p-10 text-center"><p className="text-xl font-bold mb-2">Oda kapatıldı</p><Link to="/" className="text-primary">Ana sayfaya dön</Link></div>;
  if (!membershipActive(user)) return <div className="p-10 text-center"><p className="mb-4">Watch Party için aktif üyelik gerekli.</p><Link to="/profil" className="text-primary">Üyeliğim</Link></div>;
  if (joinError) return <div className="fixed inset-0 bg-black flex items-center justify-center p-6"><div className="bg-card border border-border rounded-xl p-5 w-full max-w-xs text-center"><h2 className="font-bold mb-2">Odaya katılamadınız</h2><p className="text-sm text-muted-foreground mb-4">{joinError}</p><button onClick={() => navigate(-1)} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold">Geri Dön</button></div></div>;

  if (joinRejected) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-xs text-center">
        <h2 className="font-bold mb-2 text-destructive">İsteğiniz reddedildi</h2>
        <p className="text-sm text-muted-foreground mb-4">Oda sahibi katılım isteğinizi reddetti.</p>
        <button onClick={() => navigate('/acik-odalar')} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold">Odalar</button>
      </div>
    </div>
  );

  if (waitingForApproval) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-xs text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="font-bold mb-2">Onay bekleniyor</h2>
        <p className="text-sm text-muted-foreground mb-4">Katılım isteğiniz oda sahibine iletildi. Onaylamasını bekleyin.</p>
        <button onClick={() => navigate('/acik-odalar')} className="w-full bg-secondary text-secondary-foreground py-2.5 rounded-lg text-sm font-semibold">İptal</button>
      </div>
    </div>
  );

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
  const founderCanSeeAdmins = user?.display_role === 'founder';
  const visibleParticipants = (room.participants || []).filter((participant) => participant.user_id === room.owner_id || viewerProfiles[participant.user_id]?.role !== 'admin' || founderCanSeeAdmins);
  const openDirectMessage = (userId) => { setDirectTarget(userId); setDirectOpen(true); setChatOpen(false); setShowViewers(false); };

  return (
    <div className="fixed inset-x-0 top-0 h-screen h-[100dvh] bg-black flex flex-col overflow-hidden" style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}>
      {/* Tam ekran video + alt kontrol alanı */}
      <div ref={playerWrapRef} className="flex-1 flex min-h-0 relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <RoomNotifications participants={room?.participants || []} currentUserId={user?.id} profiles={viewerProfiles} />
        <RoleEntrance roomId={id} joinTrigger={joinCount} />
        {joinRequests.length > 0 && (
          <div className="absolute top-[max(env(safe-area-inset-top),3.5rem)] left-3 z-[65] space-y-1.5 max-w-[80%]">
            {joinRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-2 rounded-xl bg-card/95 border border-amber-400/50 px-3 py-2 shadow-2xl backdrop-blur-xl room-notif-in">
                {req.user_avatar ? <Image src={req.user_avatar} className="w-7 h-7 rounded-full" fittingType="fill" /> : <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">{(req.user_name || '?')[0]}</div>}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-white">{req.user_name}</p>
                  <p className="text-[10px] text-muted-foreground">odaya katılmak istiyor</p>
                </div>
                <button onClick={async () => { await base44.functions.invoke('room-presence', { action: 'approve-join', room_id: id, request_id: req.id }); toast({ title: 'İstek onaylandı' }); }} className="px-2.5 py-1 rounded-lg bg-green-500 text-white text-[10px] font-bold whitespace-nowrap">Onayla</button>
                <button onClick={async () => { await base44.functions.invoke('room-presence', { action: 'reject-join', room_id: id, request_id: req.id }); toast({ title: 'İstek reddedildi' }); }} className="px-2 py-1 rounded-lg bg-red-500/80 text-white text-[10px] font-bold whitespace-nowrap">Reddet</button>
              </div>
            ))}
          </div>
        )}
        {!chatOpen && !directOpen && <div className="absolute top-[max(env(safe-area-inset-top),0.75rem)] left-3 z-[55] flex items-center gap-2">
          <button onClick={handleBack} className="flex items-center justify-center w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 active:scale-95 transition"><ArrowLeft className="w-5 h-5" /></button>
          {room?.is_personal && room?.personal_room_code ? <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1.5 rounded-full border border-white/10 whitespace-nowrap">Kod: {room.personal_room_code}</span> : null}
          {room?.room_number ? <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1.5 rounded-full border border-white/10 whitespace-nowrap">Oda No: {room.room_number}</span> : null}
        </div>}
        {!chatOpen && <button onClick={() => { setShowViewers(!showViewers); setShowSettings(false); }} className={`absolute top-[max(env(safe-area-inset-top),0.75rem)] right-3 z-[55] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white border border-white/10 backdrop-blur-md transition active:scale-95 ${showViewers ? 'bg-primary/80' : 'bg-black/60'}`}><Eye className="w-4 h-4" /><span>{visibleParticipants.length}</span></button>}
        {!showViewers && (() => {
          const speakingP = (room?.participants || []).find((p) => p.user_id !== user?.id && voice.speakingIds.includes(p.user_id));
          if (!speakingP) return null;
          const prof = viewerProfiles[speakingP.user_id];
          const avatar = speakingP.avatar || prof?.avatar;
          return (
            <div className="absolute top-[max(env(safe-area-inset-top),3.5rem)] right-3 z-[58] flex items-center gap-1.5 rounded-full bg-card/95 border-2 border-green-400 px-2 py-1 shadow-2xl backdrop-blur-xl speaking-glow max-w-[140px]">
              {avatar ? <Image src={avatar} className="w-6 h-6 rounded-full object-cover" fittingType="fill" /> : <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold">{(speakingP.name || '?')[0]}</span>}
              <span className="text-xs font-semibold truncate">{speakingP.name}</span>
            </div>
          );
        })()}
        <div className={`flex items-center justify-center bg-black ${chatOpen ? 'flex-1 min-w-0' : 'flex-1 min-w-0'}`}>
          {src ? <VideoPlayer src={src} title={room.movie_title} syncState={syncState} isOwner={canMod} isTimeSource={isOwner} onPlayPause={onPlayPause} onTimeUpdate={onTimeUpdate} onSeek={onSeek} onEnded={() => setMoviePickerOpen(true)} fullscreenRef={playerWrapRef} watermark={user} /> :
            <div className="text-muted-foreground text-sm p-6 text-center">Video kaynağı yok</div>}
        </div>

        {chatOpen && (
          <div className="absolute right-0 top-0 bottom-0 z-40 flex w-full max-w-md flex-col border-l border-white/10 bg-black pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),0.5rem)] pl-[max(env(safe-area-inset-left),0px)] pr-[max(env(safe-area-inset-right),0px)] shadow-2xl"
            onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
            onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchStart.current.x; const dy = e.changedTouches[0].clientY - touchStart.current.y; if (dx > 80 && dx > Math.abs(dy) * 1.5) setChatOpen(false); }}
          >
            <ChatOverlay roomId={id} chatEnabled={chatEnabled} isOwner={canMod} isAdmin={isMod} onClose={() => setChatOpen(false)} autoDeleteMinutes={autoDeleteMinutes} countdownText={countdownText} onSetAutoDelete={setAutoDelete} voice={voice} voiceEnabled={room.voice_enabled} onDirect={() => { setDirectTarget(null); setDirectOpen(!directOpen); setChatOpen(false); setShowViewers(false); setShowSettings(false); }} onDirectUser={openDirectMessage} directUnread={directUnread} ownerId={room?.owner_id} roomModerators={room?.room_moderators || []} participants={room?.participants || []} recentParticipants={room?.recent_participants || []} viewerProfiles={viewerProfiles} presenceMap={presenceMap} onProfileCard={openUserProfile} onToggleChat={toggleChat} settingsProps={{ room, canMod, participants: room?.participants || [], roomModerators: room?.room_moderators || [], onAssignMod: assignMod, onRemoveMod: removeMod, roomName: roomNameEdit, setRoomName: setRoomNameEdit, onSaveName: saveRoomName, password: pwSetInput, setPassword: setPwSetInput, passwordOpen: showPwSet, setPasswordOpen: setShowPwSet, onVoice: toggleVoice, onChat: toggleChat, onHidden: toggleHidden, onPassword: () => savePassword(), onRemovePassword: () => setShowPwRemoveConfirm(true), onUnban: unbanUser, onPickMovie: () => setMoviePickerOpen(true), onDeleteRoom: deleteRoom }} />
          </div>
        )}

        {directOpen && (
          <div className="absolute inset-0 z-[70] w-full sm:left-auto sm:max-w-sm"
            onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
            onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchStart.current.x; const dy = e.changedTouches[0].clientY - touchStart.current.y; if (dx > 80 && dx > Math.abs(dy) * 1.5) setDirectOpen(false); }}
          >
            <RoomDirectMessages onClose={() => { setDirectOpen(false); setDirectTarget(null); }} initialUserId={directTarget} />
          </div>
        )}

        {showViewers && (
          <div className="absolute top-[max(env(safe-area-inset-top),3.5rem)] right-3 bg-card/95 border border-border rounded-xl p-2 z-[60] w-40 max-h-[55vh] overflow-y-auto shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <p className="font-semibold text-xs">İzleyiciler</p>
              <button onClick={() => setShowViewers(false)} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-1">
              {visibleParticipants.map((p) => {
                const prof = viewerProfiles[p.user_id];
                const avatar = p.avatar || prof?.avatar;
                const presence = presenceMap[p.user_id];
                const isOnline = presence?.online && (Date.now() - new Date(presence.last_seen).getTime() < 60000);
                return (
                  <button key={p.user_id} onClick={() => openUserProfile(p.user_id)} className="flex items-center gap-1.5 text-xs py-0.5 w-full text-left hover:bg-secondary/50 rounded px-1">
                    <div className="shrink-0 relative">
                      {avatar ? <Image src={avatar} className="w-6 h-6 rounded-full object-cover" fittingType="fill" /> : <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold">{(p.name || '?')[0]}</span>}
                      <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-card ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                    </div>
                    <span className="flex-1 truncate min-w-0">{p.name}{p.user_id === room.owner_id && <Crown className="w-3 h-3 text-amber-400 inline ml-0.5 shrink-0" />}</span>
                    <RoomLevelBadge level={roomLevels[p.user_id]} textOnly />
                    {!isOnline && <span className="text-[9px] text-red-400 shrink-0">çevrim dışı</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <RoomSettingsMenu open={showSettings} onClose={() => setShowSettings(false)} room={room} canMod={canMod} participants={room.participants || []} roomModerators={room.room_moderators || []} onAssignMod={assignMod} onRemoveMod={removeMod} roomName={roomNameEdit} setRoomName={setRoomNameEdit} onSaveName={saveRoomName} password={pwSetInput} setPassword={setPwSetInput} passwordOpen={showPwSet} setPasswordOpen={setShowPwSet} onVoice={toggleVoice} onChat={toggleChat} onHidden={toggleHidden} onPassword={() => savePassword()} onRemovePassword={() => setShowPwRemoveConfirm(true)} onUnban={unbanUser} onPickMovie={() => { setMoviePickerOpen(true); setShowSettings(false); }} onDeleteRoom={deleteRoom} />
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
      {profileTarget && <UserProfile userId={profileTarget} roomIdOverride={id} onBack={closeUserProfile} onMessage={(userId) => { closeUserProfile(); openDirectMessage(userId); }} embedded />}
    </div>
  );
}