import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Maximize, Minimize, Settings, Rewind, FastForward } from 'lucide-react';
import VolumeSlider from './VolumeSlider';
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({ src, title, onTimeUpdate, onPlayPause, onSeek, onEnded, onControlsChange, syncState, isOwner, isTimeSource, subtitles, fullscreenRef, watermark, controlsRaised = false }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const hideTimer = useRef(null);
  const lastSyncRef = useRef(0);

  // Ses değişikliklerini anında uygula — state değiştikçe video elementine yaz
  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.volume = volume; v.muted = muted; }
  }, [volume, muted]);

  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const togglePlay = useCallback(() => {
    if (!isOwner) return;
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
  }, [isOwner]);

  const seekTo = useCallback((t) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(t, v.duration || 0));
  }, []);

  const skip = (delta) => {
    if (!isOwner) return;
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.currentTime + delta, v.duration || 0));
    if (onSeek) onSeek(v.currentTime);
  };

  // Sync from room — drift düzeltmeli senkronizasyon.
  // is_playing herkes için uygulanır (admin durdurursa sahip de durur);
  // zaman senkronu yalnızca kaynak olmayan (isTimeSource=false) katılımcılarda.
  useEffect(() => {
    if (!syncState) return;
    const v = videoRef.current; if (!v) return;
    if (!isTimeSource) {
      const target = syncState.current_time || 0;
      const diff = v.currentTime - target;
      const absDiff = Math.abs(diff);
      if (absDiff > 3) {
        seekTo(target);
        v.playbackRate = speed;
      } else if (absDiff > 1) {
        if (diff > 0) v.playbackRate = Math.max(0.5, speed - 0.25);
        else v.playbackRate = Math.min(2, speed + 0.25);
        clearTimeout(v._syncResetTimer);
        v._syncResetTimer = setTimeout(() => { if (v) v.playbackRate = speed; }, 2000);
      } else {
        v.playbackRate = speed;
      }
    }
    if (syncState.is_playing && v.paused) v.play().catch(() => {});
    if (!syncState.is_playing && !v.paused) v.pause();
  }, [syncState?.current_time, syncState?.is_playing, syncState?.last_sync]);

  // report time to room — yalnızca gerçek kaynak (sahip) bildirir
  useEffect(() => {
    if (!isTimeSource || !onTimeUpdate) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v && !v.paused && Date.now() - lastSyncRef.current > 2000) {
        onTimeUpdate(v.currentTime);
        lastSyncRef.current = Date.now();
      }
    }, 2500);
    return () => clearInterval(id);
  }, [isOwner, onTimeUpdate]);

  const onLoaded = () => {
    const v = videoRef.current; if (!v) return;
    setDuration(v.duration);
    v.playbackRate = speed;
    v.volume = volume;
    v.muted = muted;
    // initial sync for participants (and admin)
    if (!isTimeSource && syncState) {
      const target = syncState.current_time || 0;
      if (Math.abs(v.currentTime - target) > 3) seekTo(target);
    }
    if (syncState?.is_playing) v.play().catch(() => {});
  };

  const onTime = () => {
    const v = videoRef.current; if (!v) return;
    setCurrent(v.currentTime);
  };

  const handlePlay = () => { setPlaying(true); setBuffering(false); if (isOwner && onPlayPause) onPlayPause(true); };
  const handlePause = () => { setPlaying(false); if (isOwner && onPlayPause) onPlayPause(false); };

  const toggleFullscreen = () => {
    const el = fullscreenRef?.current || containerRef.current;
    if (!document.fullscreenElement) {
      if (el?.requestFullscreen) el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (videoRef.current?.webkitEnterFullscreen) videoRef.current.webkitEnterFullscreen();
    } else {
      document.exitFullscreen?.();
    }
  };
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    const v = videoRef.current;
    const endFs = () => setFullscreen(false);
    v?.addEventListener('webkitendfullscreen', endFs);
    return () => { document.removeEventListener('fullscreenchange', h); v?.removeEventListener('webkitendfullscreen', endFs); };
  }, []);

  const moveBar = (e) => {
    if (!isOwner) return;
    const v = videoRef.current; if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seekTo(pct * v.duration);
    if (onSeek) onSeek(pct * v.duration);
  };

  const showCtrl = () => {
    setShowControls(true);
    onControlsChange?.(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { setShowControls(false); }, 4000);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden group select-none"
      onMouseMove={showCtrl} onClick={showCtrl}
      style={{ touchAction: isOwner ? 'manipulation' : 'none' }}>
      <video ref={videoRef} src={src} className="w-full h-full object-contain"
        onLoadedMetadata={onLoaded} onTimeUpdate={onTime} onPlay={handlePlay} onPause={handlePause}
        onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onEnded={onEnded}
        crossOrigin="anonymous" preload="metadata" playsInline controls={false} disablePictureInPicture={!isOwner} />

      {buffering && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}

      {isOwner && !playing && !buffering && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center">
          <span className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:scale-110 transition-transform">
            <Play className="w-10 h-10 fill-white text-white ml-1" />
          </span>
        </button>
      )}

      {subtitles && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-3 py-1 rounded pointer-events-none">{subtitles}</div>
      )}

      <div className={`absolute inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity ${controlsRaised ? 'bottom-24' : 'bottom-0'} ${showControls ? 'opacity-100' : 'opacity-0'}`} style={{ paddingBottom: controlsRaised ? undefined : 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2 mb-2 text-white text-xs">
          {isOwner && <span>{fmt(current)}</span>}
          {isOwner && <div className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer relative" onClick={moveBar}>
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${duration ? (current / duration) * 100 : 0}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full -ml-1.5" style={{ left: `${duration ? (current / duration) * 100 : 0}%` }} />
          </div>}
          {isOwner && <span>{fmt(duration)}</span>}
          <VolumeSlider volume={volume} muted={muted} onChange={(val) => { const v = videoRef.current; if (!v) return; if (val === 0) { v.muted = true; setMuted(true); } else { v.volume = val; v.muted = false; setVolume(val); setMuted(false); } }} />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 text-white">
          {isOwner && <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-lg">{playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>}
          {isOwner && <button onClick={() => skip(-10)} className="p-2 hover:bg-white/10 rounded-lg" title="10 sn geri"><Rewind className="w-5 h-5" /></button>}
          {isOwner && <button onClick={() => skip(10)} className="p-2 hover:bg-white/10 rounded-lg" title="10 sn ileri"><FastForward className="w-5 h-5" /></button>}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {isOwner && (
              <div className="relative">
                <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/10 rounded-lg" title="Ayarlar"><Settings className="w-5 h-5" /></button>
                {showSettings && (
                  <div className="absolute bottom-12 right-0 w-40 bg-card border border-border rounded-lg p-2 text-sm space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Hız</p>
                      <div className="flex flex-wrap gap-1">
                        {SPEEDS.map((s) => <button key={s} onClick={() => { setSpeed(s); videoRef.current.playbackRate = s; }} className={`px-2 py-1 rounded text-xs ${speed === s ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>{s}x</button>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-lg">{fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}