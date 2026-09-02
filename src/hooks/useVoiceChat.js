import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { checkMicrophonePermission, microphoneErrorMessage, requestMicrophoneStream, stopMicrophoneStream, subscribeToMicrophonePermission, wasMicrophoneGrantedBefore } from '@/lib/microphonePermissionManager';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ]
};

/**
 * Gerçek zamanlı WebRTC sesli sohbet (mesh network).
 * Sinyalleme VoiceSignal entity'si üzerinden yapılır.
 * Kararlı bağlantı için: ICE buffering, bağlantı durumu izleme,
 * otomatik yeniden bağlanma ve ayrılan katılımcı temizliği.
 */
export function useVoiceChat({ roomId, user, participants, voiceEnabled }) {
  const [muted, setMuted] = useState(true);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [speakingIds, setSpeakingIds] = useState([]);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [permissionState, setPermissionState] = useState('checking');
  const [permissionRemembered, setPermissionRemembered] = useState(wasMicrophoneGrantedBefore);
  const [requesting, setRequesting] = useState(false);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});          // { [otherId]: RTCPeerConnection }
  const pendingIceRef = useRef({});      // { [otherId]: candidate[] }
  const initiatedRef = useRef(new Set());
  const mutedRef = useRef(true);
  const remoteMutedRef = useRef(false);
  const deafenedRef = useRef(false);
  const analysersRef = useRef({});
  const localAnalyserRef = useRef(null);
  const participantsRef = useRef(participants);
  participantsRef.current = participants;
  const userRef = useRef(user);
  userRef.current = user;
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  // --- Sinyal gönderme ---
  const sendSignal = useCallback((toId, type, data) => {
    base44.entities.VoiceSignal.create({
      room_id: roomIdRef.current,
      from_id: userRef.current.id,
      to_id: toId,
      type,
      data: JSON.stringify(data)
    }).catch(() => {});
  }, []);

  // --- Peer bağlantısı oluştur / kapat ---
  const closePeer = useCallback((otherId) => {
    const pc = peersRef.current[otherId];
    if (pc) {
      try { pc.close(); } catch {}
      delete peersRef.current[otherId];
    }
    const meter = analysersRef.current[otherId];
    if (meter) { meter.context.close().catch(() => {}); delete analysersRef.current[otherId]; }
    delete pendingIceRef.current[otherId];
    initiatedRef.current.delete(otherId);
  }, []);

  const createPeer = useCallback((otherId) => {
    if (peersRef.current[otherId]) return peersRef.current[otherId];
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[otherId] = pc;
    pendingIceRef.current[otherId] = [];

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    } else {
      // sendrecv: mikrofon açıldığında replaceTrack ile ses gitmesi için
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(otherId, 'ice', e.candidate);
    };

    // ICE bağlantı durumu izleme — koparsa yeniden bağlan
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        // Kısa bekleme sonra yeniden dene
        setTimeout(() => {
          if (peersRef.current[otherId] === pc && pc.iceConnectionState !== 'connected') {
            try { pc.restartIce(); } catch {}
            // Tekrar offer gönder
            if (userRef.current.id < otherId) {
              initiateOffer(otherId);
            }
          }
        }, 1500);
      }
    };

    pc.ontrack = (e) => {
      let audio = pc._audioEl;
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        pc._audioEl = audio;
      }
      audio.srcObject = e.streams[0];
      audio.muted = deafenedRef.current;
      audio.play().catch(() => {});
      if (!analysersRef.current[otherId]) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const context = new AudioCtx(); const analyser = context.createAnalyser();
          analyser.fftSize = 256; context.createMediaStreamSource(e.streams[0]).connect(analyser);
          analysersRef.current[otherId] = { context, analyser, data: new Uint8Array(analyser.fftSize) };
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        closePeer(otherId);
        // Yeniden bağlanmayı dene
        setTimeout(() => {
          if (participantsRef.current?.some((p) => p.user_id === otherId)) {
            initiateOffer(otherId);
          }
        }, 2000);
      }
    };

    return pc;
  }, [sendSignal, closePeer]);

  // --- Offer başlat (düşük ID'li kullanıcı başlatır) ---
  const initiateOffer = useCallback(async (otherId, force = false) => {
    if (!userRef.current) return;
    if (!force && userRef.current.id >= otherId) return;
    let pc = peersRef.current[otherId];
    if (!pc || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      pc = createPeer(otherId);
    }
    if (pc.signalingState !== 'stable') return;
    initiatedRef.current.add(otherId);
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      sendSignal(otherId, 'offer', offer);
    } catch {}
  }, [createPeer, sendSignal]);

  // --- Sinyal işleme ---
  const handleSignal = useCallback(async (s) => {
    let pc = peersRef.current[s.from_id];
    if (!pc) {
      // Karşıdan offer/answer geldiyse peer oluştur
      if (s.type === 'offer') {
        pc = createPeer(s.from_id);
      } else {
        // ice/answer ama peer yok — eski sinyal, yoksay
        return;
      }
    }

    let payload;
    try { payload = JSON.parse(s.data); } catch { return; }

    try {
      if (s.type === 'offer') {
        await pc.setRemoteDescription(payload);
        // Bekleyen ICE candidate'ları uygula
        const pending = pendingIceRef.current[s.from_id] || [];
        for (const c of pending) {
          try { await pc.addIceCandidate(c); } catch {}
        }
        pendingIceRef.current[s.from_id] = [];
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        sendSignal(s.from_id, 'answer', ans);
      } else if (s.type === 'answer') {
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(payload);
          const pending = pendingIceRef.current[s.from_id] || [];
          for (const c of pending) {
            try { await pc.addIceCandidate(c); } catch {}
          }
          pendingIceRef.current[s.from_id] = [];
        }
      } else if (s.type === 'ice') {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(payload); } catch {}
        } else {
          // Remote description henüz yok — buffer'la
          if (!pendingIceRef.current[s.from_id]) pendingIceRef.current[s.from_id] = [];
          pendingIceRef.current[s.from_id].push(payload);
        }
      }
    } catch {}
  }, [createPeer, sendSignal]);

  // Sinyal aboneliği — stabilize refs ile sabit
  useEffect(() => {
    if (!voiceEnabled || !user || !roomId) return;
    const unsub = base44.entities.VoiceSignal.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.to_id === user.id) handleSignal(ev.data);
    });
    return unsub;
  }, [voiceEnabled, user?.id, roomId, handleSignal]);

  // --- Tüm peer'lara bağlan ---
  const connectToAll = useCallback(async () => {
    if (!userRef.current) return;
    const others = (participantsRef.current || [])
      .map((p) => p.user_id)
      .filter((uid) => uid !== userRef.current.id);
    for (const otherId of others) {
      if (userRef.current.id < otherId) {
        await initiateOffer(otherId);
      }
    }
  }, [initiateOffer]);

  // Mikrofon yalnızca kullanıcının düğmeye basmasıyla başlatılır.
  const startMicrophone = useCallback(async () => {
    if (requesting || remoteMutedRef.current) return;
    setRequesting(true); setError('');
    try {
      const stream = await requestMicrophoneStream();
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => { track.enabled = true; });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !localAnalyserRef.current) {
        const context = new AudioCtx(); const analyser = context.createAnalyser();
        analyser.fftSize = 256; context.createMediaStreamSource(stream).connect(analyser);
        localAnalyserRef.current = { context, analyser, data: new Uint8Array(analyser.fftSize) };
      }
      Object.values(peersRef.current).forEach((pc) => {
        const track = stream.getAudioTracks()[0];
        const transceiver = pc.getTransceivers().find((item) => item.receiver?.track?.kind === 'audio' || item.sender?.track?.kind === 'audio');
        if (transceiver) { transceiver.sender.replaceTrack(track).catch(() => {}); }
        else pc.addTrack(track, stream);
      });
      mutedRef.current = false; setMuted(false); setActive(true); setPermissionRemembered(true); setPermissionState('granted');
      // iOS: AudioContext suspended durumda başlar, kullanıcı dokunuşuyla resume et
      if (localAnalyserRef.current) localAnalyserRef.current.context.resume().catch(() => {});
      Object.values(analysersRef.current).forEach((meter) => meter.context.resume().catch(() => {}));
      Object.values(peersRef.current).forEach((pc) => { if (pc._audioEl) pc._audioEl.play().catch(() => {}); });
    } catch (e) {
      setPermissionState(e?.name === 'NotAllowedError' ? 'denied' : permissionState);
      setError(microphoneErrorMessage(e));
    } finally { setRequesting(false); }
  }, [connectToAll, permissionState, requesting]);

  const stopLocalMicrophone = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) stopMicrophoneStream(stream);
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((item) => item.track?.kind === 'audio');
      sender?.replaceTrack(null).catch(() => {});
    });
    localAnalyserRef.current?.context.close().catch(() => {}); localAnalyserRef.current = null;
    localStreamRef.current = null; mutedRef.current = true; setMuted(true); setActive(false); setLocalSpeaking(false);
  }, []);

  useEffect(() => {
    if (!voiceEnabled || !roomId || !user) return;
    let cancelled = false;
    setError(''); mutedRef.current = true; setMuted(true);
    const refreshPermission = () => checkMicrophonePermission().then((state) => { if (!cancelled) setPermissionState(state); });
    refreshPermission();
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') refreshPermission(); };
    const unsubscribePermission = subscribeToMicrophonePermission((state) => { if (!cancelled) setPermissionState(state); });
    window.addEventListener('focus', refreshPermission);
    document.addEventListener('visibilitychange', onVisibilityChange);
    connectToAll();
    return () => {
      cancelled = true; unsubscribePermission();
      window.removeEventListener('focus', refreshPermission);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      Object.keys(peersRef.current).forEach((peerId) => closePeer(peerId));
      if (localStreamRef.current) stopMicrophoneStream(localStreamRef.current);
      localAnalyserRef.current?.context.close().catch(() => {}); localAnalyserRef.current = null;
      localStreamRef.current = null;
      base44.entities.VoiceSignal.deleteMany({ room_id: roomId, from_id: user.id }).catch(() => {});
    };
  }, [voiceEnabled, roomId, user?.id, connectToAll, closePeer]);

  // --- Katılımcı değişikliklerini izle: yeni gelenlere bağlan, ayrılanları temizle ---
  const participantIdsKey = (participants || []).map((p) => p.user_id).filter(Boolean).sort().join(',');
  useEffect(() => {
    if (!voiceEnabled || !user) return;
    const currentIds = new Set((participants || []).map((p) => p.user_id).filter((uid) => uid !== user?.id));
    // Ayrılan katılımcıların peer'larını kapat
    Object.keys(peersRef.current).forEach((otherId) => {
      if (!currentIds.has(otherId)) {
        closePeer(otherId);
      }
    });
    // Yeni katılımcılara bağlan
    connectToAll();
  }, [participantIdsKey, voiceEnabled, user?.id, connectToAll, closePeer]);

  // Uzaktan susturma zorunluluğu — oda sahibi/admin susturduğunda mikrofonu gerçekten kapat
  useEffect(() => {
    if (!user) return;
    const myParticipant = (participants || []).find((p) => p.user_id === user.id);
    const isRemoteMuted = !!myParticipant?.muted;
    if (isRemoteMuted !== remoteMutedRef.current) {
      remoteMutedRef.current = isRemoteMuted;
      setRemoteMuted(isRemoteMuted);
      const effectiveMuted = isRemoteMuted || mutedRef.current;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !effectiveMuted));
    }
  }, [participants, user?.id]);

  useEffect(() => {
    if (!voiceEnabled) return;
    const level = (meter) => {
      if (!meter) return 0;
      meter.analyser.getByteTimeDomainData(meter.data);
      let sum = 0; for (const value of meter.data) { const sample = (value - 128) / 128; sum += sample * sample; }
      return Math.sqrt(sum / meter.data.length);
    };
    const timer = setInterval(() => {
      setLocalSpeaking(!mutedRef.current && !remoteMutedRef.current && level(localAnalyserRef.current) > 0.035);
      setSpeakingIds(Object.entries(analysersRef.current).filter(([, meter]) => level(meter) > 0.035).map(([id]) => id));
    }, 150);
    return () => clearInterval(timer);
  }, [voiceEnabled]);

  const toggleMute = useCallback(() => {
    if (remoteMutedRef.current || requesting) return;
    if (!localStreamRef.current) { startMicrophone(); return; }
    stopLocalMicrophone();
  }, [requesting, startMicrophone, stopLocalMicrophone]);

  const toggleDeafen = useCallback(() => {
    const next = !deafenedRef.current;
    deafenedRef.current = next; setDeafened(next);
    Object.values(peersRef.current).forEach((pc) => { if (pc._audioEl) { pc._audioEl.muted = next; if (!next) pc._audioEl.play().catch(() => {}); } });
    Object.values(analysersRef.current).forEach((meter) => meter.context.resume().catch(() => {}));
  }, []);

  return { muted, remoteMuted, deafened, localSpeaking, speakingIds, active, error, permissionState, permissionRemembered, requesting, toggleMute, toggleDeafen };
}