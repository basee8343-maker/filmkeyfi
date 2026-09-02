import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

let sharedMicrophoneStream = null;

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
      pc.addTransceiver('audio', { direction: 'recvonly' });
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
          if (localStreamRef.current && participantsRef.current?.some((p) => p.user_id === otherId)) {
            initiateOffer(otherId);
          }
        }, 2000);
      }
    };

    return pc;
  }, [sendSignal, closePeer]);

  // --- Offer başlat (düşük ID'li kullanıcı başlatır) ---
  const initiateOffer = useCallback(async (otherId, force = false) => {
    if (!localStreamRef.current || !userRef.current) return;
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
    if (!localStreamRef.current || !userRef.current) return;
    const others = (participantsRef.current || [])
      .map((p) => p.user_id)
      .filter((uid) => uid !== userRef.current.id);
    for (const otherId of others) {
      if (userRef.current.id < otherId) {
        await initiateOffer(otherId);
      }
    }
  }, [initiateOffer]);

  // --- Mikrofonu uygulama oturumu boyunca tek kez al, odaya kapalı gir ---
  useEffect(() => {
    if (!voiceEnabled || !roomId || !user) return;
    let cancelled = false;
    setError(''); mutedRef.current = true; setMuted(true);
    const acquire = async () => {
      if (!sharedMicrophoneStream?.getAudioTracks().some((track) => track.readyState === 'live')) {
        sharedMicrophoneStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      }
      if (cancelled) return;
      localStreamRef.current = sharedMicrophoneStream;
      sharedMicrophoneStream.getAudioTracks().forEach((track) => { track.enabled = false; });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !localAnalyserRef.current) {
        const context = new AudioCtx(); const analyser = context.createAnalyser();
        analyser.fftSize = 256; context.createMediaStreamSource(sharedMicrophoneStream).connect(analyser);
        localAnalyserRef.current = { context, analyser, data: new Uint8Array(analyser.fftSize) };
      }
      Object.values(peersRef.current).forEach((pc) => {
        const track = sharedMicrophoneStream.getAudioTracks()[0];
        const transceiver = pc.getTransceivers().find((item) => item.receiver?.track?.kind === 'audio');
        if (transceiver) { transceiver.direction = 'sendrecv'; transceiver.sender.replaceTrack(track).catch(() => {}); }
        else pc.addTrack(track, sharedMicrophoneStream);
      });
      setActive(true);
      for (const peerId of Object.keys(peersRef.current)) await initiateOffer(peerId, true);
      await connectToAll();
    };
    acquire().catch((e) => setError(e?.message || 'Mikrofon izni reddedildi'));
    return () => {
      cancelled = true;
      Object.keys(peersRef.current).forEach((peerId) => closePeer(peerId));
      localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false; });
      localAnalyserRef.current?.context.close().catch(() => {}); localAnalyserRef.current = null;
      localStreamRef.current = null; setActive(false); setLocalSpeaking(false); setSpeakingIds([]);
      base44.entities.VoiceSignal.deleteMany({ room_id: roomId, from_id: user.id }).catch(() => {});
    };
  }, [voiceEnabled, roomId, user?.id, connectToAll, closePeer, initiateOffer]);

  // --- Katılımcı değişikliklerini izle: yeni gelenlere bağlan, ayrılanları temizle ---
  const participantIdsKey = (participants || []).map((p) => p.user_id).filter(Boolean).sort().join(',');
  useEffect(() => {
    if (!active) return;
    const currentIds = new Set((participants || []).map((p) => p.user_id).filter((uid) => uid !== user?.id));
    // Ayrılan katılımcıların peer'larını kapat
    Object.keys(peersRef.current).forEach((otherId) => {
      if (!currentIds.has(otherId)) {
        closePeer(otherId);
      }
    });
    // Yeni katılımcılara bağlan
    connectToAll();
  }, [participantIdsKey, active, connectToAll, closePeer]);

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
    if (!active) return;
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
  }, [active]);

  const toggleMute = useCallback(() => {
    if (remoteMutedRef.current || !localStreamRef.current) return;
    const next = !mutedRef.current;
    mutedRef.current = next; setMuted(next);
    localStreamRef.current.getAudioTracks().forEach((track) => { track.enabled = !next; });
    localAnalyserRef.current?.context.resume().catch(() => {});
    Object.values(analysersRef.current).forEach((meter) => meter.context.resume().catch(() => {}));
    Object.values(peersRef.current).forEach((pc) => pc._audioEl?.play().catch(() => {}));
  }, []);

  const toggleDeafen = useCallback(() => {
    const next = !deafenedRef.current;
    deafenedRef.current = next; setDeafened(next);
    Object.values(peersRef.current).forEach((pc) => { if (pc._audioEl) { pc._audioEl.muted = next; if (!next) pc._audioEl.play().catch(() => {}); } });
    Object.values(analysersRef.current).forEach((meter) => meter.context.resume().catch(() => {}));
  }, []);

  return { muted, remoteMuted, deafened, localSpeaking, speakingIds, active, error, toggleMute, toggleDeafen };
}