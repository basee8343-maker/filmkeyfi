import { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function supportsMediaCors(media) {
  const url = new URL(media.currentSrc || media.src, window.location.href);
  if (url.origin === window.location.origin) return true;
  try {
    const response = await fetch(url.href, { method: 'HEAD', mode: 'cors', cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

export default function useMediaVolume(mediaRef, mediaKey) {
  const [volume, setVolume] = useState(() => clamp(localStorage.getItem('filmkeyfi_player_volume') ?? 1));
  const [muted, setMuted] = useState(() => localStorage.getItem('filmkeyfi_player_muted') === 'true');
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  const lastVolumeRef = useRef(volume || 1);
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const initPromiseRef = useRef(null);
  const webAudioDisabledRef = useRef(false);

  const applyVolume = useCallback(() => {
    const video = mediaRef.current;
    if (!video) return;
    if (gainRef.current) {
      video.volume = 1;
      video.muted = false;
      gainRef.current.gain.value = mutedRef.current ? 0 : volumeRef.current;
      return;
    }
    video.volume = volumeRef.current;
    video.muted = mutedRef.current;
  }, [mediaRef]);

  const resumeAudio = useCallback(() => {
    const video = mediaRef.current;
    if (!video) return Promise.resolve(false);
    applyVolume();
    if (sourceRef.current) {
      if (contextRef.current?.state === 'suspended') return contextRef.current.resume().then(() => true).catch(() => false);
      return Promise.resolve(true);
    }
    const needsIOSGain = isIOS() && !mutedRef.current && volumeRef.current > 0 && volumeRef.current < 1;
    if (!needsIOSGain || webAudioDisabledRef.current) return Promise.resolve(false);
    if (initPromiseRef.current) return initPromiseRef.current;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      webAudioDisabledRef.current = true;
      return Promise.resolve(false);
    }
    const context = new AudioContextClass();
    contextRef.current = context;
    const task = (async () => {
      try {
        if (context.state === 'suspended') await context.resume();
        if (!(await supportsMediaCors(video))) throw new Error('CORS');
        const source = context.createMediaElementSource(video);
        const gain = context.createGain();
        source.connect(gain);
        gain.connect(context.destination);
        sourceRef.current = source;
        gainRef.current = gain;
        applyVolume();
        console.info('[VideoAudio] iOS Web Audio etkin:', context.state, 'gain:', gain.gain.value);
        return true;
      } catch (error) {
        webAudioDisabledRef.current = true;
        contextRef.current = null;
        await context.close().catch(() => {});
        applyVolume();
        console.info('[VideoAudio] Native ses kontrolü kullanılıyor:', error?.message || error);
        return false;
      }
    })();
    initPromiseRef.current = task;
    return task;
  }, [applyVolume, mediaRef]);

  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    applyVolume();
    localStorage.setItem('filmkeyfi_player_volume', String(volume));
    localStorage.setItem('filmkeyfi_player_muted', String(muted));
  }, [volume, muted, applyVolume]);

  useEffect(() => {
    webAudioDisabledRef.current = false;
    initPromiseRef.current = null;
    applyVolume();
    return () => {
      sourceRef.current?.disconnect();
      gainRef.current?.disconnect();
      contextRef.current?.close().catch(() => {});
      sourceRef.current = null;
      gainRef.current = null;
      contextRef.current = null;
    };
  }, [mediaKey, applyVolume]);

  const setVolumePercent = useCallback((percent) => {
    const next = clamp(Number(percent) / 100);
    volumeRef.current = next;
    mutedRef.current = next === 0;
    if (next > 0) lastVolumeRef.current = next;
    setVolume(next);
    setMuted(next === 0);
    applyVolume();
    void resumeAudio();
    console.info('[VideoAudio] Native volume:', mediaRef.current?.volume, 'UI:', Math.round(next * 100));
  }, [applyVolume, mediaRef, resumeAudio]);

  const toggleMute = useCallback(() => {
    const nextMuted = !mutedRef.current;
    if (!nextMuted && volumeRef.current === 0) volumeRef.current = lastVolumeRef.current || 1;
    mutedRef.current = nextMuted;
    setVolume(volumeRef.current);
    setMuted(nextMuted);
    applyVolume();
    void resumeAudio();
  }, [applyVolume, resumeAudio]);

  return { volume, muted, setVolumePercent, toggleMute, resumeAudio, applyCurrentVolume: applyVolume };
}