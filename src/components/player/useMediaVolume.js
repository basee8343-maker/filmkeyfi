import { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const detectPlatform = () => ({
  ios: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  pwa: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
});

async function verifyMediaCors(media) {
  const url = new URL(media.currentSrc || media.src, window.location.href);
  if (url.origin === window.location.origin) return;
  const response = await fetch(url.href, { method: 'GET', mode: 'cors', cache: 'no-store', headers: { Range: 'bytes=0-0' } });
  response.body?.cancel();
  if (!response.ok && response.status !== 206) throw new Error(`Video sunucusu CORS isteğini reddetti (${response.status})`);
}

export default function useMediaVolume(mediaRef) {
  const [volume, setVolume] = useState(() => clamp(localStorage.getItem('filmkeyfi_player_volume') ?? 1));
  const [muted, setMuted] = useState(() => localStorage.getItem('filmkeyfi_player_muted') === 'true');
  const [audioError, setAudioError] = useState('');
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  const lastVolumeRef = useRef(volume || 1);
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const initPromiseRef = useRef(null);
  const disposedRef = useRef(false);

  const applyGain = useCallback(() => {
    if (!gainRef.current) return;
    gainRef.current.gain.value = mutedRef.current ? 0 : volumeRef.current;
  }, []);

  const resumeAudio = useCallback(() => {
    if (sourceRef.current) {
      applyGain();
      if (contextRef.current?.state === 'suspended') return contextRef.current.resume().then(() => true);
      return Promise.resolve(true);
    }
    if (initPromiseRef.current) return initPromiseRef.current;
    const video = mediaRef.current;
    console.info('[VideoAudio] video element bulundu mu?', !!video, { ...detectPlatform() });
    if (!video) return Promise.resolve(false);

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setAudioError('Bu cihaz Web Audio API desteği sunmuyor.');
      return Promise.resolve(false);
    }
    const context = contextRef.current || new AudioContextClass();
    contextRef.current = context;

    const task = (async () => {
      try {
        if (context.state === 'suspended') await context.resume();
        console.info('[VideoAudio] AudioContext state:', context.state);
        await verifyMediaCors(video);
        if (disposedRef.current) return false;
        if (!sourceRef.current) {
          const source = context.createMediaElementSource(video);
          const gain = context.createGain();
          source.connect(gain);
          gain.connect(context.destination);
          sourceRef.current = source;
          gainRef.current = gain;
          video.muted = false;
          console.info('[VideoAudio] MediaElementSource oluşturuldu:', true);
        }
        applyGain();
        setAudioError('');
        console.info('[VideoAudio] gainNode mevcut mu?', !!gainRef.current, 'mevcut volume:', volumeRef.current, 'mevcut gain:', gainRef.current?.gain.value);
        return true;
      } catch (error) {
        video.muted = true;
        const corsError = error instanceof TypeError ? 'Video sunucusu Web Audio için gerekli CORS iznini vermiyor.' : error.message;
        setAudioError(corsError);
        console.error('[VideoAudio] CORS/AudioContext hatası:', error);
        initPromiseRef.current = null;
        return false;
      }
    })();
    initPromiseRef.current = task;
    return task;
  }, [applyGain, mediaRef]);

  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    applyGain();
    localStorage.setItem('filmkeyfi_player_volume', String(volume));
    localStorage.setItem('filmkeyfi_player_muted', String(muted));
  }, [volume, muted, applyGain]);

  useEffect(() => () => {
    disposedRef.current = true;
    sourceRef.current?.disconnect();
    gainRef.current?.disconnect();
    contextRef.current?.close().catch(() => {});
  }, []);

  const setVolumePercent = useCallback(async (percent) => {
    const next = clamp(Number(percent) / 100);
    volumeRef.current = next;
    mutedRef.current = next === 0;
    if (next > 0) lastVolumeRef.current = next;
    setVolume(next);
    setMuted(next === 0);
    const ready = await resumeAudio();
    if (ready) applyGain();
    console.info(`[VideoAudio] Volume UI: ${Math.round(next * 100)} | Gain: ${gainRef.current?.gain.value ?? 'yok'} | AudioContext: ${contextRef.current?.state ?? 'yok'}`);
  }, [applyGain, resumeAudio]);

  const toggleMute = useCallback(async () => {
    const nextMuted = !mutedRef.current;
    if (!nextMuted && volumeRef.current === 0) volumeRef.current = lastVolumeRef.current || 1;
    mutedRef.current = nextMuted;
    setVolume(volumeRef.current);
    setMuted(nextMuted);
    const ready = await resumeAudio();
    if (ready) applyGain();
    console.info(`[VideoAudio] Mute: ${nextMuted} | Gain: ${gainRef.current?.gain.value ?? 'yok'} | AudioContext: ${contextRef.current?.state ?? 'yok'}`);
  }, [applyGain, resumeAudio]);

  return { volume, muted, audioError, setVolumePercent, toggleMute, resumeAudio, applyCurrentVolume: applyGain };
}