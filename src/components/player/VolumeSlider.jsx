import { useRef, useCallback, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function VolumeSlider({ volume, muted, onChange }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);

  const value = muted ? 0 : volume;

  const setFromClientX = useCallback((clientX) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    onChange(pct);
  }, [onChange]);

  const onPointerDown = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    setFromClientX(e.clientX);
    const move = (ev) => { if (draggingRef.current) setFromClientX(ev.clientX); };
    const up = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={() => onChange(muted ? (volume || 1) : 0)}
        className="p-1.5 hover:bg-white/10 rounded-lg shrink-0"
        type="button"
      >
        {muted || value === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        className="relative w-16 sm:w-24 h-5 flex items-center cursor-pointer touch-none"
      >
        <div className="absolute inset-x-0 h-1.5 bg-white/30 rounded-full" />
        <div
          className="absolute left-0 h-1.5 bg-primary rounded-full pointer-events-none"
          style={{ width: `${value * 100}%` }}
        />
        <div
          className="absolute w-4 h-4 bg-white rounded-full shadow pointer-events-none -ml-2"
          style={{ left: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}