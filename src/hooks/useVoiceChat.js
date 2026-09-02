import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { checkMicrophonePermission, microphoneErrorMessage, requestMicrophoneStream, stopMicrophoneStream, subscribeToMicrophonePermission, wasMicrophoneGrantedBefore } from '@/lib/microphonePermissionManager';
import { setMediaStream } from '@/lib/mediaCompat';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ]
};

// Eski tarayıcı uyumluluğu: RTCPeerConnection ve AudioContext için fallback
const RTCPeerConnectionClass = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
const AudioContextClass = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;

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
  const reconnectTimersRef = useRef({});
  const mountedRef = useRef(true);
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
  const sendSignal = useCallback(async (toId, type, data) => {
    try {
      await base44.entities.VoiceSignal.create({
        room_id: roomIdRef.current,
        from_id: userRef.current.id,
        to_id: toId,
        type,
        data: JSON.stringify(data)
      });
    } catch (signalError) {
      console.error(`[WebRTC] ${type} sinyali gönderilemedi`, signalError);
      throw signalError;
    }
  }, []);

  // --- Peer bağlantısı oluştur / kapat ---
  const closePeer = useCallback((otherId) => {
    const pc = peersRef.current[otherId];
    if (reconnectTimersRef.current[otherId]) {
      clearTimeout(reconnectTimersRef.current[otherId]);
      delete reconnectTimersRef.current[otherId];
    }
    if (pc) {
      pc._audioEl?.pause();
      setMediaStream(pc._audioEl, null);
      pc._audioEl?.remove();
      pc.getReceivers?.().forEach((receiver) => receiver.track?.stop());
      try { pc.close(); } catch {}
      delete peersRef.current[otherId];
    }
    const meter = analysersRef.current[otherId];
    if (meter) { meter.context.close().catch(() => {}); delete analysersRef.current[otherId]; }
    delete pendingIceRef.current[otherId];
  }, []);

  const createPeer = useCallback((otherId) => {
    if (peersRef.current[otherId]) return peersRef.current[otherId];
    if (!RTCPeerConnectionClass) { setError('Tarayıcınız WebRTC desteklemiyor.'); return null; }
    const pc = new RTCPeerConnectionClass(ICE_SERVERS);
    peersRef.current[otherId] = pc;
    pendingIceRef.current[otherId] ||= [];
    pc._localIce = [];
    pc._descriptionSent = false;

    const localTrack = localStreamRef.current?.getAudioTracks().find((track) => track.readyState === 'live');
    if (localTrack) {
      pc._audioSender = pc.addTrack(localTrack, localStreamRef.current);
    } else if (pc.addTransceiver) {
      pc._audioSender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
    }

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      if (!pc._descriptionSent) pc._localIce.push(e.candidate);
      else sendSignal(otherId, 'ice', e.candidate).catch(() => {});
    };

    // ICE bağlantı durumu izleme — koparsa yeniden bağlan
    pc.oniceconnectionstatechange = () => {
      console.info(`[WebRTC] ${otherId} ICE: ${pc.iceConnectionState}, sinyal: ${pc.signalingState}`);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        if (reconnectTimersRef.current[otherId]) clearTimeout(reconnectTimersRef.current[otherId]);
        delete reconnectTimersRef.current[otherId];
        return;
      }
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        if (reconnectTimersRef.current[otherId]) clearTimeout(reconnectTimersRef.current[otherId]);
        reconnectTimersRef.current[otherId] = setTimeout(() => {
          if (!mountedRef.current || peersRef.current[otherId] !== pc) return;
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') return;
          try { pc.restartIce(); } catch {}
          initiateOffer(otherId, true);
        }, pc.iceConnectionState === 'failed' ? (userRef.current.id < otherId ? 500 : 1500) : (userRef.current.id < otherId ? 3000 : 4000));
      }
    };

    const attachRemoteStream = (stream) => {
      if (!stream) return;
      let audio = pc._audioEl;
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.playsInline = true;
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        audio.style.display = 'none';
        audio.dataset.voicePeer = otherId;
        document.body.appendChild(audio);
        pc._audioEl = audio;
      }
      setMediaStream(audio, stream);
      audio.volume = 1;
      audio.muted = deafenedRef.current;
      audio.play().catch((playError) => console.warn('[WebRTC] Uzak ses otomatik oynatılamadı; kullanıcı etkileşimi beklenecek', playError));
      if (!analysersRef.current[otherId] && AudioContextClass) {
        try {
          const context = new AudioContextClass(); const analyser = context.createAnalyser();
          analyser.fftSize = 256; context.createMediaStreamSource(stream).connect(analyser);
          analysersRef.current[otherId] = { context, analyser, data: new Uint8Array(analyser.fftSize) };
        } catch (meterError) {
          console.warn('[WebRTC] Uzak ses seviyesi ölçülemedi', meterError);
        }
      }
    };

    pc.onaddstream = (e) => attachRemoteStream(e.stream);
    pc.ontrack = (e) => {
      const stream = e.streams?.[0] || new MediaStream([e.track]);
      attachRemoteStream(stream);
      e.track.onunmute = () => pc._audioEl?.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      console.info(`[WebRTC] ${otherId} bağlantı: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        closePeer(otherId);
        reconnectTimersRef.current[otherId] = setTimeout(() => {
          if (mountedRef.current && participantsRef.current?.some((p) => p.user_id === otherId)) initiateOffer(otherId, true);
        }, userRef.current.id < otherId ? 500 : 1500);
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
    if (!pc || pc.signalingState !== 'stable') return;
    try {
      pc._descriptionSent = false;
      pc._localIce = [];
      const offer = await pc.createOffer({ iceRestart: force });
      await pc.setLocalDescription(offer);
      await sendSignal(otherId, 'offer', pc.localDescription);
      pc._descriptionSent = true;
      const candidates = pc._localIce.splice(0);
      await Promise.all(candidates.map((candidate) => sendSignal(otherId, 'ice', candidate)));
    } catch (offerError) {
      console.error('[WebRTC] Offer oluşturulamadı', offerError);
    }
  }, [createPeer, sendSignal]);

  // --- Sinyal işleme ---
  const handleSignal = useCallback(async (s) => {
    let payload;
    try { payload = JSON.parse(s.data); } catch (parseError) {
      console.error('[WebRTC] Geçersiz sinyal verisi', parseError);
      return;
    }

    let pc = peersRef.current[s.from_id];
    if (!pc && s.type === 'ice') {
      pendingIceRef.current[s.from_id] ||= [];
      pendingIceRef.current[s.from_id].push(payload);
      return;
    }
    if (!pc && s.type === 'offer') pc = createPeer(s.from_id);
    if (!pc) return;

    const applyPendingIce = async () => {
      const candidates = pendingIceRef.current[s.from_id] || [];
      pendingIceRef.current[s.from_id] = [];
      for (const candidate of candidates) {
        try { await pc.addIceCandidate(candidate); }
        catch (iceError) { console.warn('[WebRTC] Bekleyen ICE adayı eklenemedi', iceError); }
      }
    };

    try {
      if (s.type === 'offer') {
        if (pc.signalingState !== 'stable') {
          await pc.setLocalDescription({ type: 'rollback' });
        }
        await pc.setRemoteDescription(payload);
        await applyPendingIce();
        const answer = await pc.createAnswer();
        pc._descriptionSent = false;
        pc._localIce = [];
        await pc.setLocalDescription(answer);
        await sendSignal(s.from_id, 'answer', pc.localDescription);
        pc._descriptionSent = true;
        const candidates = pc._localIce.splice(0);
        await Promise.all(candidates.map((candidate) => sendSignal(s.from_id, 'ice', candidate)));
      } else if (s.type === 'answer' && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(payload);
        await applyPendingIce();
      } else if (s.type === 'ice') {
        if (pc.remoteDescription) await pc.addIceCandidate(payload);
        else {
          pendingIceRef.current[s.from_id] ||= [];
          pendingIceRef.current[s.from_id].push(payload);
        }
      }
    } catch (signalError) {
      console.error(`[WebRTC] ${s.type} sinyali işlenemedi`, signalError);
    }
  }, [createPeer, sendSignal]);

  // Sinyal aboneliği — stabilize refs ile sabit
  useEffect(() => {
    if (!voiceEnabled || !user || !roomId) return;
    const unsub = base44.entities.VoiceSignal.subscribe((ev) => {
      if (ev.type === 'create' && ev.data?.room_id === roomId && ev.data?.to_id === user.id) handleSignal(ev.data);
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
      const track = stream.getAudioTracks().find((item) => item.readyState === 'live');
      if (!track) {
        console.error('[WebRTC] Mikrofon izni verildi ancak canlı audio track alınamadı', stream.getTracks());
        stopMicrophoneStream(stream);
        throw new Error('Mikrofon izni verildi ancak ses kaynağı alınamadı. Cihazınızın mikrofon ayarlarını kontrol edin.');
      }

      localStreamRef.current = stream;
      track.enabled = true;
      track.onended = () => {
        if (localStreamRef.current !== stream) return;
        console.warn('[WebRTC] Mikrofon track’i cihaz tarafından sonlandırıldı');
        localStreamRef.current = null;
        mutedRef.current = true;
        setMuted(true);
        setActive(false);
        setLocalSpeaking(false);
      };

      await connectToAll();
      for (const [otherId, pc] of Object.entries(peersRef.current)) {
        if (pc._audioSender) {
          await pc._audioSender.replaceTrack(track);
        } else if (pc.addTrack) {
          pc._audioSender = pc.addTrack(track, stream);
          await initiateOffer(otherId, true);
        } else if (pc.addStream) {
          pc.addStream(stream);
          await initiateOffer(otherId, true);
        }
      }

      const AudioCtx = AudioContextClass || window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !localAnalyserRef.current) {
        const context = new AudioCtx(); const analyser = context.createAnalyser();
        analyser.fftSize = 256; context.createMediaStreamSource(stream).connect(analyser);
        localAnalyserRef.current = { context, analyser, data: new Uint8Array(analyser.fftSize) };
      }
      mutedRef.current = false; setMuted(false); setActive(true); setPermissionRemembered(true); setPermissionState('granted');
      if (localAnalyserRef.current) await localAnalyserRef.current.context.resume().catch(() => {});
      Object.values(analysersRef.current).forEach((meter) => meter.context.resume().catch(() => {}));
      Object.values(peersRef.current).forEach((pc) => {
        if (pc._audioEl) {
          pc._audioEl.muted = deafenedRef.current;
          pc._audioEl.play().catch(() => {});
        }
      });
    } catch (e) {
      console.error('[WebRTC] Mikrofon başlatılamadı', e);
      setPermissionState(e?.name === 'NotAllowedError' ? 'denied' : permissionState);
      setError(microphoneErrorMessage(e));
    } finally { setRequesting(false); }
  }, [connectToAll, initiateOffer, permissionState, requesting]);

  const stopLocalMicrophone = useCallback(() => {
    const stream = localStreamRef.current;
    stream?.getAudioTracks().forEach((track) => { track.enabled = false; });
    Object.values(peersRef.current).forEach((pc) => pc._audioSender?.replaceTrack(null).catch(() => {}));
    if (stream) stopMicrophoneStream(stream);
    localAnalyserRef.current?.context.close().catch(() => {}); localAnalyserRef.current = null;
    localStreamRef.current = null; mutedRef.current = true; setMuted(true); setActive(false); setLocalSpeaking(false);
  }, []);

  useEffect(() => {
    if (!voiceEnabled || !roomId || !user) return;
    let cancelled = false;
    mountedRef.current = true;
    setError(''); mutedRef.current = true; setMuted(true);
    const refreshPermission = () => checkMicrophonePermission().then((state) => { if (!cancelled) setPermissionState(state); });
    refreshPermission();
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') refreshPermission(); };
    const unsubscribePermission = subscribeToMicrophonePermission((state) => { if (!cancelled) setPermissionState(state); });
    window.addEventListener('focus', refreshPermission);
    document.addEventListener('visibilitychange', onVisibilityChange);
    connectToAll();
    return () => {
      cancelled = true; mountedRef.current = false; unsubscribePermission();
      window.removeEventListener('focus', refreshPermission);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      Object.keys(peersRef.current).forEach((peerId) => closePeer(peerId));
      if (localStreamRef.current) stopMicrophoneStream(localStreamRef.current);
      localAnalyserRef.current?.context.close().catch(() => {}); localAnalyserRef.current = null;
      localStreamRef.current = null;
      mutedRef.current = true;
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
    Object.values(peersRef.current).forEach((pc) => {
      if (!pc._audioEl) return;
      pc._audioEl.muted = next;
      if (!next) pc._audioEl.play().catch((playError) => console.warn('[WebRTC] Hoparlör yeniden başlatılamadı', playError));
    });
    Object.values(analysersRef.current).forEach((meter) => meter.context.resume().catch(() => {}));
  }, []);

  return { muted, remoteMuted, deafened, localSpeaking, speakingIds, active: active && !remoteMuted, error, permissionState, permissionRemembered, requesting, toggleMute, toggleDeafen };
}