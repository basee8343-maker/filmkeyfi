import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { base44 } from '@/api/base44Client';
import { createVoiceOutput, unlockVoicePlayback } from '@/lib/voicePlayback';

const initialDebug = { participantCount: 0, remoteParticipants: 0, remoteTracks: 0, playback: 'hazır' };
const friendlyMicError = (error) => {
  if (error?.name === 'NotAllowedError') return '🎤 Mikrofon izni verilmedi.';
  if (error?.name === 'NotReadableError') return '🎤 Mikrofon kullanılamıyor.';
  return '🎤 Mikrofon başlatılamadı.';
};

export function useVoiceChat({ roomId, user, participants, voiceEnabled }) {
  const roomRef = useRef(null);
  const audioElementsRef = useRef(new Set());
  const mutedByModeratorRef = useRef(false);
  const deafenedRef = useRef(false);
  const lastAudioRetryRef = useRef(0);
  const [active, setActive] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [speakingIds, setSpeakingIds] = useState([]);
  const [participantMicStates, setParticipantMicStates] = useState({});
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [debug, setDebug] = useState(initialDebug);
  const [everVoiceEnabled, setEverVoiceEnabled] = useState(voiceEnabled);
  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; if (voiceEnabled) setEverVoiceEnabled(true); }, [voiceEnabled]);

  const refreshState = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const people = [room.localParticipant, ...room.remoteParticipants.values()];
    const micStates = {};
    people.forEach((participant) => {
      const publication = participant.getTrackPublication(Track.Source.Microphone);
      micStates[participant.identity] = !!publication && !publication.isMuted;
    });
    setParticipantMicStates(micStates);
    setActive(!!micStates[room.localParticipant.identity]);
    setLocalSpeaking(room.localParticipant.isSpeaking && !!micStates[room.localParticipant.identity]);
    setDebug({
      participantCount: people.length,
      remoteParticipants: room.remoteParticipants.size,
      remoteTracks: audioElementsRef.current.size,
      playback: room.canPlaybackAudio ? 'oynatılıyor' : 'engellendi',
    });
  }, []);

  const attachRemoteAudio = useCallback((track) => {
    if (track.kind !== Track.Kind.Audio) return;
    if ([...audioElementsRef.current].some((element) => element.dataset.livekitTrack === track.sid)) return;
    const element = createVoiceOutput(track, roomId);
    element.dataset.livekitVoice = roomId;
    element.dataset.livekitTrack = track.sid;
    element.muted = deafenedRef.current;
    audioElementsRef.current.add(element);
    // Mikrofon izninden bağımsız, önceden açılmış kalıcı ses kanalından oynat.
    Promise.all([roomRef.current?.startAudio(), element.play(), unlockVoicePlayback()]).then(() => {
      setAudioBlocked(false);
      setError('');
    }).catch(() => {
      setAudioBlocked(true);
      setError('🔊 Sesi başlatmak için ekrana dokunun.');
    });
    refreshState();
  }, [refreshState, roomId]);

  const retryAudio = useCallback(async () => {
    try {
      await Promise.all([
        roomRef.current?.startAudio(),
        unlockVoicePlayback(),
        ...[...audioElementsRef.current].map((element) => element.play()),
      ]);
      setAudioBlocked(false);
      setError('');
      refreshState();
    } catch (playError) {
      console.warn('[LiveKit] Audio playback could not start', playError);
      setAudioBlocked(true);
      setError('🔊 Ses başlatılamadı. Ekrana dokunarak tekrar deneyin.');
    }
  }, [refreshState]);

  useEffect(() => {
    if (!voiceEnabled || !roomId || !user?.id) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true, autoSubscribe: true });
    roomRef.current = room;

    const updateSpeakers = (speakers) => {
      const nextIds = speakers.filter((participant) => participant.identity !== user.id).map((participant) => participant.identity);
      setSpeakingIds((current) => current.length === nextIds.length && current.every((id, index) => id === nextIds[index]) ? current : nextIds);
      const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      setLocalSpeaking(room.localParticipant.isSpeaking && !!publication && !publication.isMuted);
    };
    const onUnsubscribed = (track) => {
      audioElementsRef.current.forEach((element) => {
        if (element.dataset.livekitTrack !== track.sid) return;
        audioElementsRef.current.delete(element);
        element.remove();
      });
      track.detach().forEach((element) => element.remove());
      refreshState();
    };
    const onDisconnected = () => { setConnectionState('disconnected'); setError('🌐 Bağlantı yeniden kuruluyor.'); };

    room.on(RoomEvent.TrackSubscribed, attachRemoteAudio);
    room.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, refreshState);
    room.on(RoomEvent.ParticipantDisconnected, refreshState);
    room.on(RoomEvent.TrackPublished, refreshState);
    room.on(RoomEvent.TrackUnpublished, refreshState);
    room.on(RoomEvent.TrackMuted, refreshState);
    room.on(RoomEvent.TrackUnmuted, refreshState);
    room.on(RoomEvent.LocalTrackPublished, refreshState);
    room.on(RoomEvent.LocalTrackUnpublished, refreshState);
    room.on(RoomEvent.ActiveSpeakersChanged, updateSpeakers);
    room.on(RoomEvent.Reconnecting, () => { setConnectionState('reconnecting'); setError('🌐 Bağlantı yeniden kuruluyor.'); });
    room.on(RoomEvent.Reconnected, () => { setConnectionState('connected'); setError(''); refreshState(); });
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => { setAudioBlocked(!room.canPlaybackAudio); refreshState(); });

    (async () => {
      try {
        setConnectionState('connecting');
        const response = await base44.functions.invoke('livekitToken', {
          roomName: roomId,
          participantName: user.title || user.username || user.full_name || 'Kullanıcı',
        });
        if (cancelled) return;
        await room.connect(response.data.url, response.data.token, { autoSubscribe: true });
        if (cancelled) return;
        setConnectionState('connected');
        setError('');
        // Bağlantı kurulur kurulmaz ses çalmayı dene — önceki etkileşim açtıysa anında çalışır.
        room.startAudio().catch(() => {});
        setAudioBlocked(!room.canPlaybackAudio);
        refreshState();
      } catch (connectError) {
        if (cancelled || connectError?.name === 'AbortError') return;
        console.error('[LiveKit] Connection failed', connectError);
        setConnectionState('disconnected');
        setError('🌐 Ses bağlantısı kurulamadı.');
      }
    })();

    // Mikrofon izninden bağımsız olarak her kullanıcı etkileşiminde uzak sesi hazır tut.
    // Dinleyici kalıcıdır; sonradan yayınlanan sesler de sayfa değiştirmeden başlar.
    const startAudioOnInteraction = () => {
      if (room.canPlaybackAudio && [...audioElementsRef.current].every((element) => !element.paused)) return;
      const now = Date.now();
      if (now - lastAudioRetryRef.current < 1500) return;
      lastAudioRetryRef.current = now;
      retryAudio();
    };
    document.addEventListener('pointerdown', startAudioOnInteraction, { passive: true });
    document.addEventListener('touchend', startAudioOnInteraction, { passive: true });
    document.addEventListener('keydown', startAudioOnInteraction);

    return () => {
      cancelled = true;
      room.removeAllListeners();
      audioElementsRef.current.forEach((element) => element.remove());
      audioElementsRef.current.clear();
      room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
      room.disconnect();
      if (roomRef.current === room) roomRef.current = null;
      document.removeEventListener('pointerdown', startAudioOnInteraction);
      document.removeEventListener('touchend', startAudioOnInteraction);
      document.removeEventListener('keydown', startAudioOnInteraction);
      setActive(false);
      setSpeakingIds([]);
      setParticipantMicStates({});
      setConnectionState('disconnected');
      setDebug(initialDebug);
    };
  }, [attachRemoteAudio, refreshState, retryAudio, roomId, user?.id, everVoiceEnabled]);

  useEffect(() => {
    const moderatorMuted = !!participants?.find((participant) => participant.user_id === user?.id)?.muted;
    mutedByModeratorRef.current = moderatorMuted;
    setRemoteMuted(moderatorMuted);
    if (moderatorMuted && roomRef.current) {
      roomRef.current.localParticipant.setMicrophoneEnabled(false).then(refreshState).catch(() => {});
    }
  }, [participants, refreshState, user?.id]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room || requesting || mutedByModeratorRef.current || connectionState !== 'connected') return;
    if (!voiceEnabledRef.current && !active) return;
    setRequesting(true);
    setError('');
    try {
      if (active) await room.localParticipant.setMicrophoneEnabled(false);
      else await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      refreshState();
    } catch (micError) {
      console.error('[LiveKit] Microphone toggle failed', micError);
      await retryAudio();
      setError(friendlyMicError(micError));
    } finally { setRequesting(false); }
  }, [active, connectionState, refreshState, requesting, retryAudio]);

  const toggleDeafen = useCallback(() => {
    const next = !deafenedRef.current;
    deafenedRef.current = next;
    setDeafened(next);
    audioElementsRef.current.forEach((element) => { element.muted = next; });
    if (!next) retryAudio();
  }, [deafened, retryAudio]);

  return { muted: !active, remoteMuted, deafened, localSpeaking, speakingIds, participantMicStates, active, error, requesting, connectionState, audioBlocked, retryAudio, toggleMute, toggleDeafen, debug, voiceEnabled };
}