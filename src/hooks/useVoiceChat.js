import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { base44 } from '@/api/base44Client';

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
    const element = track.attach();
    element.autoplay = true;
    element.playsInline = true;
    element.setAttribute('playsinline', 'true');
    element.dataset.livekitVoice = roomId;
    element.dataset.livekitTrack = track.sid;
    element.style.display = 'none';
    element.muted = deafenedRef.current;
    document.body.appendChild(element);
    audioElementsRef.current.add(element);
    element.play().then(() => setAudioBlocked(false)).catch((playError) => {
      console.warn('[LiveKit] Remote audio autoplay blocked', playError);
      setAudioBlocked(true);
      setError('🔊 Ses başlatılamadı. Ekrana dokunarak tekrar deneyin.');
    });
    refreshState();
  }, [refreshState, roomId]);

  const retryAudio = useCallback(async () => {
    try {
      await roomRef.current?.startAudio();
      await Promise.all([...audioElementsRef.current].map((element) => element.play()));
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
      setSpeakingIds(speakers.filter((participant) => participant.identity !== user.id).map((participant) => participant.identity));
      refreshState();
    };
    const onUnsubscribed = (track) => {
      track.detach().forEach((element) => { audioElementsRef.current.delete(element); element.remove(); });
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
        room.startAudio().catch(() => setAudioBlocked(true));
        // Mikrofonu otomatik aç ve izin iste — odaya girer girmez sesli iletişim başlasın
        room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true })
          .then(() => { if (!cancelled) refreshState(); })
          .catch((micError) => {
            console.error('[LiveKit] Auto mic enable failed', micError);
            if (!cancelled) setError(friendlyMicError(micError));
          });
        refreshState();
      } catch (connectError) {
        console.error('[LiveKit] Connection failed', connectError);
        if (!cancelled) { setConnectionState('disconnected'); setError('🌐 Ses bağlantısı kurulamadı.'); }
      }
    })();

    // Tarayıcılar kullanıcı etkileşimi olmadan ses otomatik oynatmayı engeller.
    // İlk dokunma/tıkta sesi otomatik başlat — hoparlör butonuna basmaya gerek kalmasın.
    const startAudioOnInteraction = () => {
      roomRef.current?.startAudio().then(() => {
        audioElementsRef.current.forEach((element) => element.play().catch(() => {}));
        setAudioBlocked(false);
        setError('');
      }).catch(() => {});
    };
    document.addEventListener('touchstart', startAudioOnInteraction, { once: true });
    document.addEventListener('click', startAudioOnInteraction, { once: true });

    return () => {
      cancelled = true;
      room.removeAllListeners();
      audioElementsRef.current.forEach((element) => element.remove());
      audioElementsRef.current.clear();
      room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
      room.disconnect();
      if (roomRef.current === room) roomRef.current = null;
      document.removeEventListener('touchstart', startAudioOnInteraction);
      document.removeEventListener('click', startAudioOnInteraction);
      setActive(false);
      setSpeakingIds([]);
      setParticipantMicStates({});
      setConnectionState('disconnected');
      setDebug(initialDebug);
    };
  }, [attachRemoteAudio, refreshState, roomId, user?.id, voiceEnabled]);

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
    setRequesting(true);
    setError('');
    try {
      if (active) await room.localParticipant.setMicrophoneEnabled(false);
      else await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      refreshState();
    } catch (micError) {
      console.error('[LiveKit] Microphone toggle failed', micError);
      setError(friendlyMicError(micError));
    } finally { setRequesting(false); }
  }, [active, connectionState, refreshState, requesting]);

  const toggleDeafen = useCallback(() => {
    const next = !deafenedRef.current;
    deafenedRef.current = next;
    setDeafened(next);
    audioElementsRef.current.forEach((element) => { element.muted = next; });
    if (!next) retryAudio();
  }, [deafened, retryAudio]);

  return { muted: !active, remoteMuted, deafened, localSpeaking, speakingIds, participantMicStates, active, error, requesting, connectionState, audioBlocked, retryAudio, toggleMute, toggleDeafen, debug };
}