import { useRef, useCallback, useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function VolumeSlider({ volume, muted, onChange }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const [showPercent, setShowPercent] = useState(false);
  const fadeTimer = useRef(null);
  const prevVolumeRef = useRef(volume || 1);

  const value = muted ? 0 : volume;

  const showOverlay = useCallback(() => {
    setShowPercent(true);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setShowPercent(false), 1500);
  }, []);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  const setFromClientX = useCallback((clientX) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    onChange(pct);
    showOverlay();
  }, [onChange, showOverlay]);

  const onPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    if (value > 0.1) prevVolumeRef.current = value;
    setFromClientX(e.clientX);
    const move = (ev) => { if (draggingRef.current) setFromClientX(ev.clientX); };
    const up = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setShowPercent(false), 1500);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const toggleMute = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (muted || value === 0) {
      onChange(prevVolumeRef.current || 1);
    } else {
      prevVolumeRef.current = volume || 1;
      onChange(0);
    }
    showOverlay();
  };

  const percent = Math.round(value * 100);

  return (
    <div className="flex items-center gap-1 shrink-0 relative">
      <button
        onClick={toggleMute}
        className="p-2 hover:bg-white/10 rounded-lg shrink-0 touch-manipulation"
        type="button"
      >
        {muted || value === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        className="relative w-20 sm:w-28 h-8 flex items-center cursor-pointer touch-none"
      >
        <div className="absolute inset-x-0 h-1.5 bg-white/30 rounded-full" />
        <div
          className="absolute left-0 h-1.5 bg-primary rounded-full pointer-events-none"
          style={{ width: `${value * 100}%` }}
        />
        <div
          className="absolute w-5 h-5 bg-white rounded-full shadow-lg pointer-events-none -ml-2.5"
          style={{ left: `${value * 100}%` }}
        />
      </div>
      {showPercent && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs font-bold px-2.5 py-1 rounded-lg pointer-events-none whitespace-nowrap z-50">
          {percent}%
        </div>
      )}
    </div>
  );
}