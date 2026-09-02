import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VideoPlayer from '@/components/player/VideoPlayer';
import ChatOverlay from '@/components/player/ChatOverlay';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Mic, MicOff, Crown, X } from 'lucide-react';
import { Image } from '@/components/ui/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RoomSettingsMenu from '@/components/player/RoomSettingsMenu';
import PartyControlBar from '@/components/player/PartyControlBar';
import LiveKitDebugPanel from '@/components/player/LiveKitDebugPanel';
import RoomDirectMessages from '@/components/player/RoomDirectMessages';
import useSocialBadges from '@/hooks/useSocialBadges';

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
  const [needPassword, setNeedPassword] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwSetInput, setPwSetInput] = useState('');
  const [showPwSet, setShowPwSet] = useState(false);
  const [showPwRemoveConfirm, setShowPwRemoveConfirm] = useState(false);
  const [syncState, setSyncState] = useState({ is_playing: false, current_time: 0, last_sync: null });
  const [unread, setUnread] = useState(0);
  const [viewerProfiles, setViewerProfiles] = useState({});
  const [joinError, setJoinError] = useState('');
  const [voiceReady, setVoiceReady] = useState(false);
  const joinedRef = useRef(false);
  const ghostRef = useRef(false);
  const kickedRef = useRef(false);
  const lastUpdateRef = useRef(0);
  const lastSyncRef = useRef({ is_playing: false, current_time: 0 });
  const playerWrapRef = useRef(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const voice = useVoiceChat({ roomId: id, user, participants: room?.participants, voiceEnabled: !!room?.voice_enabled && voiceReady });
  const { messages: directUnread } = useSocialBadges(user?.id);

  useEffect(() => {
    base44.entities.Room.get(id).then(async (r) => {
      setRoom(r);
      setSyncState({ is_playing: r.is_playing, current_time: r.current_time, last_sync: r.last_sync });
      if (r.movie_id) base44.entities.Movie.get(r.movie_id).then(setMovie).catch(() => {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !room || joinedRef.current) return;
    if (room.password && room.owner_id !== user.id && user.role !== 'admin' && !room.participants?.some((p) => p.user_id === user.id)) {
      setNeedPassword(true);
      return;
    }
    base44.functions.invoke('room-presence', { action: 'join', room_id: id })
      .then((res) => {
        joinedRef.current = true;
        setVoiceReady(true);
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

  // Sohbet kapalıyken gelen mesajlar için okunmamış sayacı
  useEffect(() => {
    if (chatOpen) { setUnread(0); return; }
    const unsub = base44.entities.RoomMessage.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.room_id === id && ev.data?.type !== 'system') setUnread((u) => u + 1);
    });
    return unsub;
  }, [chatOpen, id]);

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

  const handleBack = async () => { await leaveRoom(); navigate(-1); };

  useEffect(() => {
    return () => { leaveRoom(); };
  }, []);

  const isOwner = user?.id === room?.owner_id;
  const isMod = user?.role === 'admin' || user?.role === 'moderator';
  const canMod = isOwner || isMod;

  const updateRoom = async (patch, immediate = false) => {
    if (!isOwner) return;
    if (!immediate && Date.now() - lastUpdateRef.current < 2000) return;
    lastUpdateRef.current = Date.now();
    await base44.entities.Room.update(id, { ...patch, last_sync: new Date().toISOString() }).catch(() => {});
  };

  const onPlayPause = (playing) => updateRoom({ is_playing: playing }, true);
  const onTimeUpdate = (t) => updateRoom({ current_time: t });
  const onSeek = (t) => updateRoom({ current_time: t, is_playing: true }, true);

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
    try { await base44.functions.invoke('room-presence', { action: 'kick', room_id: id, target_id: uid }); toast({ title: 'Kullanıcı odadan çıkarıldı' }); }
    catch (e) { toast({ title: 'Çıkarılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
    setShowViewers(false);
  };

  const onTouchStart = (e) => { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
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
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden" style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}>
      {/* Tam ekran video + alt kontrol alanı */}
      <div ref={playerWrapRef} className="flex-1 flex min-h-0 relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={`flex items-center justify-center bg-black ${chatOpen ? 'flex-1 min-w-0' : 'flex-1 min-w-0'}`}>
          {src ? <VideoPlayer src={src} title={room.movie_title} syncState={syncState} isOwner={isOwner} onPlayPause={onPlayPause} onTimeUpdate={onTimeUpdate} onSeek={onSeek} fullscreenRef={playerWrapRef} watermark={user} controlsRaised /> :
            <div className="text-muted-foreground text-sm p-6 text-center">Video kaynağı yok</div>}
        </div>

        {chatOpen && (
          <div className="absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-border bg-card/95 pb-20 pt-[max(env(safe-area-inset-top),0.75rem)] shadow-2xl backdrop-blur-xl">
            <ChatOverlay roomId={id} chatEnabled={chatEnabled} isOwner={canMod} isAdmin={isMod} onClose={() => setChatOpen(false)} />
          </div>
        )}

        {directOpen && <div className="absolute inset-0 z-[70] pb-20"><RoomDirectMessages onClose={() => setDirectOpen(false)} /></div>}

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
                      {avatar ? <Image src={avatar} className={`w-7 h-7 rounded-full object-cover ${speaking ? 'speaking-glow' : ''}`} fittingType="fill" /> : <span className={`w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold ${speaking ? 'speaking-glow' : ''}`}>{(p.name || '?')[0]}</span>}
                    </Link>
                    <Link to={`/kullanici/${p.user_id}`} className="flex-1 truncate hover:underline">{p.name}{p.user_id === room.owner_id && <Crown className="w-3 h-3 text-amber-400 inline ml-1" />}</Link>
                    {micActive ? <Mic className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    {canMod && p.user_id !== user.id && room.voice_enabled && (
                      <button onClick={() => toggleMuteUser(p.user_id)} className={`p-1 rounded shrink-0 ${p.muted ? 'text-red-400' : 'text-green-400'}`} title={p.muted ? 'Mikrofonu aç' : 'Mikrofonu kapat'}>
                        {p.muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {canMod && p.user_id !== user.id && <button onClick={() => removeUser(p.user_id)} className="text-xs text-destructive shrink-0">Çıkar</button>}
                  </div>
                );
              })}
            </div>

          </div>
        )}
        <RoomSettingsMenu open={showSettings} onClose={() => setShowSettings(false)} room={room} canMod={canMod} password={pwSetInput} setPassword={setPwSetInput} passwordOpen={showPwSet} setPasswordOpen={setShowPwSet} onVoice={toggleVoice} onChat={toggleChat} onHidden={toggleHidden} onPassword={() => savePassword()} onRemovePassword={() => setShowPwRemoveConfirm(true)} />
      </div>

      <LiveKitDebugPanel voice={voice} />
      <PartyControlBar voice={voice} voiceEnabled={room.voice_enabled} viewerCount={visibleParticipants.length} unread={unread} directUnread={directUnread} settingsOpen={showSettings} chatOpen={chatOpen} directOpen={directOpen} onBack={handleBack} onViewers={() => { setShowViewers(!showViewers); setShowSettings(false); }} onSettings={() => { setShowSettings(!showSettings); setShowViewers(false); }} onChat={() => { setChatOpen(!chatOpen); setDirectOpen(false); }} onDirect={() => { setDirectOpen(!directOpen); setChatOpen(false); setShowViewers(false); setShowSettings(false); }} />

      <ConfirmDialog
        open={showPwRemoveConfirm}
        onOpenChange={setShowPwRemoveConfirm}
        title="Şifre kaldırılsın mı?"
        description="Oda şifresini kaldırırsanız oda herkese açık hale gelir."
        confirmText="Kaldır"
        onConfirm={() => savePassword('')}
      />
    </div>
  );
}