import { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isPWA = () => window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator?.standalone === true;

async function supportsMediaCors(video) {
  const url = video.currentSrc || video.src;
  if (!url) return true;
  let parsed;
  try { parsed = new URL(url, window.location.href); } catch { return true; }
  if (parsed.origin === window.location.origin) return true;
  // Base44 public media already sends CORS headers. Older iOS Safari can
  // falsely reject the Range probe, so do not block Web Audio for this host.
  if (parsed.hostname === 'base44.app' || parsed.hostname.endsWith('.base44.app') || parsed.hostname === 'media.base44.com') return true;
  try {
    const response = await fetch(parsed.href, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      headers: { Range: 'bytes=0-0' },
    });
    const allowed = response.ok || response.status === 206;
    response.body?.cancel().catch(() => {});
    return allowed;
  } catch {
    return false;
  }
}

/**
 * Web Audio API tabanlı ses kontrolü.
 * Mimari: HTMLVideoElement -> MediaElementAudioSourceNode -> GainNode -> AudioContext.destination
 * Tüm platformlarda (iOS Safari, iOS PWA, Desktop) GainNode üzerinden gerçek ses seviyesi kontrol edilir.
 * Aynı video elementi için yalnızca bir kez createMediaElementSource çağrılır.
 */
export default function useMediaVolume(mediaRef, mediaKey) {
  const [volume, setVolume] = useState(() => clamp(localStorage.getItem('filmkeyfi_player_volume') ?? 1));
  const [muted, setMuted] = useState(() => localStorage.getItem('filmkeyfi_player_muted') === 'true');
  const [audioError, setAudioError] = useState(null);
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  const lastVolumeRef = useRef(volume || 1);
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const initPromiseRef = useRef(null);
  const sourceBoundKeyRef = useRef(null);

  const applyGain = useCallback(() => {
    const gain = gainRef.current;
    if (!gain) return;
    const target = mutedRef.current ? 0 : volumeRef.current;
    gain.gain.value = target;
  }, []);

  const applyVolume = useCallback(() => {
    const video = mediaRef.current;
    if (!video) return;
    if (gainRef.current) {
      // Web Audio aktif: native video output GainNode ile yönetilir.
      video.volume = 1;
      video.muted = false;
      applyGain();
    } else {
      // Web Audio henüz hazır değil: native fallback (ilk etkileşim öncesi)
      video.volume = mutedRef.current ? 0 : volumeRef.current;
      video.muted = mutedRef.current;
    }
  }, [mediaRef, applyGain]);

  const ensureAudioGraph = useCallback(() => {
    const video = mediaRef.current;
    console.info('[VideoAudio] Video element bulundu:', !!video, '| iOS:', isIOS(), '| PWA:', isPWA(), '| GainNode:', !!gainRef.current);
    if (!video) return Promise.resolve(false);
    if (initPromiseRef.current) return initPromiseRef.current;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setAudioError('AudioContext desteklenmiyor');
      console.warn('[VideoAudio] AudioContext desteklenmiyor — native fallback kullanılıyor.');
      return Promise.resolve(false);
    }

    let context = contextRef.current;
    if (!context) {
      context = new AudioContextClass();
      contextRef.current = context;
    }

    const task = (async () => {
      try {
        if (context.state === 'suspended') await context.resume();

        // Aynı video elementi için yalnızca bir kez source bağla.
        const bindKey = mediaKey || video.src || 'default';
        if (sourceBoundKeyRef.current !== bindKey || !sourceRef.current) {
          if (sourceRef.current) {
            try { sourceRef.current.disconnect(); } catch {}
            sourceRef.current = null;
            gainRef.current = null;
          }
          if (!(await supportsMediaCors(video))) {
            throw new Error('CORS: video cross-origin ve CORS header eksik');
          }
          const source = context.createMediaElementSource(video);
          const gain = context.createGain();
          source.connect(gain);
          gain.connect(context.destination);
          sourceRef.current = source;
          gainRef.current = gain;
          sourceBoundKeyRef.current = bindKey;
          console.info('[VideoAudio] MediaElementSource oluşturuldu. bindKey:', bindKey);
        }

        if (context.state === 'suspended') await context.resume();
        if (context.state !== 'running') throw new Error(`AudioContext başlatılamadı: ${context.state}`);
        setAudioError(null);
        applyVolume();
        console.info('[VideoAudio] AudioContext state:', context.state,
          '| gain:', gainRef.current?.gain.value,
          '| volume UI:', Math.round(volumeRef.current * 100),
          '| muted:', mutedRef.current,
          '| iOS:', isIOS(), '| PWA:', isPWA());
        return true;
      } catch (error) {
        initPromiseRef.current = null;
        setAudioError(error?.message || String(error));
        console.error('[VideoAudio] Web Audio başlatılamadı:', error);
        // Web Audio başarısız: native fallback'e dön.
        try { sourceRef.current?.disconnect(); } catch {}
        try { gainRef.current?.disconnect(); } catch {}
        sourceRef.current = null;
        gainRef.current = null;
        applyVolume();
        return false;
      }
    })();

    initPromiseRef.current = task;
    return task;
  }, [mediaRef, mediaKey, applyVolume]);

  const resumeAudio = useCallback(() => {
    const video = mediaRef.current;
    if (!video) return Promise.resolve(false);
    return ensureAudioGraph().then((ok) => {
      if (ok && contextRef.current?.state === 'suspended') {
        return contextRef.current.resume().then(() => true).catch(() => false);
      }
      return ok;
    });
  }, [ensureAudioGraph]);

  // State değişikliklerinde gain'i güncelle.
  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    if (volume > 0) lastVolumeRef.current = volume;
    localStorage.setItem('filmkeyfi_player_volume', String(volume));
    localStorage.setItem('filmkeyfi_player_muted', String(muted));
    applyVolume();
  }, [volume, muted, applyVolume]);

  // Video src değiştiğinde: yeni video elementine graph yeniden bağlanacak,
  // ama AudioContext kapatılmaz. init promise sıfırlanır.
  useEffect(() => {
    initPromiseRef.current = null;
    setAudioError(null);
    // src değişince eski source'u bırak; yeni video için yeniden bağlanacak.
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
      gainRef.current = null;
      sourceBoundKeyRef.current = null;
    }
    applyVolume();
    // İlk kullanıcı etkileşimine kadar beklemeden graph kurma.
  }, [mediaKey, applyVolume]);

  // Unmount: AudioContext ve node'ları temizle.
  useEffect(() => {
    return () => {
      try { sourceRef.current?.disconnect(); } catch {}
      try { gainRef.current?.disconnect(); } catch {}
      sourceRef.current = null;
      gainRef.current = null;
      sourceBoundKeyRef.current = null;
      initPromiseRef.current = null;
      contextRef.current?.close().catch(() => {});
      contextRef.current = null;
    };
  }, []);

  const setVolumePercent = useCallback((percent) => {
    const next = clamp(Number(percent) / 100);
    volumeRef.current = next;
    mutedRef.current = next === 0;
    if (next > 0) lastVolumeRef.current = next;
    setVolume(next);
    setMuted(next === 0);
    applyVolume();
    void resumeAudio();
    console.info('[VideoAudio] Volume UI:', Math.round(next * 100),
      '| Gain:', gainRef.current ? (next === 0 ? 0 : next) : 'native',
      '| AudioContext:', contextRef.current?.state || 'yok');
  }, [applyVolume, resumeAudio]);

  const toggleMute = useCallback(() => {
    const nextMuted = !mutedRef.current;
    if (!nextMuted && volumeRef.current === 0) {
      volumeRef.current = lastVolumeRef.current || 1;
    }
    mutedRef.current = nextMuted;
    setVolume(volumeRef.current);
    setMuted(nextMuted);
    applyVolume();
    void resumeAudio();
    console.info('[VideoAudio] Mute:', nextMuted,
      '| Gain:', gainRef.current ? (nextMuted ? 0 : volumeRef.current) : 'native',
      '| AudioContext:', contextRef.current?.state || 'yok');
  }, [applyVolume, resumeAudio]);

  return { volume, muted, audioError, setVolumePercent, toggleMute, resumeAudio, applyCurrentVolume: applyVolume };
}