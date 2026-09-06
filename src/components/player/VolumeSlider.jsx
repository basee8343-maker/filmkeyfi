import { Volume2, VolumeX } from 'lucide-react';

export default function VolumeSlider({ volume, muted, onChange, onToggleMute }) {
  const percent = muted ? 0 : Math.round(volume * 100);
  const stop = (event) => event.stopPropagation();
  const mute = (event) => {
    event.stopPropagation();
    onToggleMute();
  };
  const change = (event) => {
    event.stopPropagation();
    onChange(Number(event.currentTarget.value));
  };

  return (
    <div
      className="relative z-[70] isolate flex min-w-0 shrink-0 items-center gap-2 pointer-events-auto"
      onClick={stop} onDoubleClick={stop} onMouseDown={stop} onMouseUp={stop}
      onPointerDown={stop} onPointerUp={stop} onPointerCancel={stop}
      onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop} onTouchCancel={stop}
    >
      <button type="button" onClick={mute} className="rounded-lg p-2 hover:bg-white/10" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>
        {muted || percent === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={percent}
        onInput={change}
        className="relative z-[71] h-8 w-14 cursor-pointer accent-primary pointer-events-auto min-[390px]:w-20 landscape:w-24 sm:w-28"
        style={{ touchAction: 'none' }}
        aria-label="Ses seviyesi"
        aria-valuetext={`%${percent}`}
      />
      <span className="hidden w-9 select-none text-center text-xs tabular-nums text-white min-[360px]:block">{percent}%</span>
    </div>
  );
}