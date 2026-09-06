import { Volume2, VolumeX } from 'lucide-react';

export default function VolumeSlider({ volume, muted, onChange, onToggleMute }) {
  const percent = muted ? 0 : Math.round(volume * 100);
  const stop = (event) => event.stopPropagation();

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2" onClick={stop} onPointerDown={stop} onTouchStart={stop}>
      <button type="button" onClick={onToggleMute} className="rounded-lg p-2 hover:bg-white/10" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>
        {muted || percent === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={percent}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        className="h-8 w-14 cursor-pointer accent-primary min-[390px]:w-20 landscape:w-24 sm:w-28"
        style={{ touchAction: 'none' }}
        aria-label="Ses seviyesi"
        aria-valuetext={`%${percent}`}
      />
      <span className="hidden w-9 select-none text-center text-xs tabular-nums text-white min-[360px]:block">{percent}%</span>
    </div>
  );
}