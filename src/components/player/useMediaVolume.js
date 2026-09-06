import { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export default function useMediaVolume(mediaRef) {
  const [volume, setVolume] = useState(() => clamp(localStorage.getItem('filmkeyfi_player_volume') ?? 1));
  const [muted, setMuted] = useState(() => localStorage.getItem('filmkeyfi_player_muted') === 'true');
  const previousVolume = useRef(volume || 1);
  const graphRef = useRef(null);

  const connectFallback = useCallback(() => {
    if (graphRef.current || !mediaRef.current) return graphRef.current;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      const context = new AudioContext();
      const source = context.createMediaElementSource(mediaRef.current);
      const gain = context.createGain();
      source.connect(gain).connect(context.destination);
      return (graphRef.current = { context, source, gain });
    } catch { return null; }
  }, [mediaRef]);

  const apply = useCallback((level, isMuted, interactive = false) => {
    const media = mediaRef.current;
    if (!media) return;
    const next = clamp(level);
    const graph = graphRef.current;
    if (graph) {
      media.volume = 1; media.muted = isMuted;
      graph.gain.gain.value = isMuted ? 0 : next;
      if (interactive) graph.context.resume().catch(() => {});
      return;
    }
    try { media.volume = next; media.muted = isMuted || next === 0; } catch {}
    if (interactive && Math.abs(media.volume - next) > 0.01) {
      const fallback = connectFallback();
      if (fallback) { media.volume = 1; media.muted = isMuted; fallback.gain.gain.value = isMuted ? 0 : next; fallback.context.resume().catch(() => {}); }
    }
  }, [connectFallback, mediaRef]);

  useEffect(() => { apply(volume, muted); localStorage.setItem('filmkeyfi_player_volume', String(volume)); localStorage.setItem('filmkeyfi_player_muted', String(muted)); }, [volume, muted, apply]);
  useEffect(() => () => { graphRef.current?.source.disconnect(); graphRef.current?.gain.disconnect(); graphRef.current?.context.close().catch(() => {}); }, []);

  const setVolumePercent = useCallback((percent) => { const next = clamp(Number(percent) / 100); if (next) previousVolume.current = next; apply(next, next === 0, true); setVolume(next); setMuted(next === 0); }, [apply]);
  const toggleMute = useCallback(() => { const nextMuted = !muted && volume > 0; const next = volume > 0 ? volume : previousVolume.current; apply(next, nextMuted, true); setVolume(next); setMuted(nextMuted); }, [apply, muted, volume]);
  return { volume, muted, setVolumePercent, toggleMute, applyCurrentVolume: () => apply(volume, muted) };
}