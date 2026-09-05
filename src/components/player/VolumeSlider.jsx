import { Volume2, VolumeX } from 'lucide-react';

// Çalışan ses kontrolü: hoparlör ikonu + range slider + kalıcı yüzde etiketi.
// Range input mobil/masaüstü güvenilir çalışır; accent-primary ile renkli.
export default function VolumeSlider({ volume, muted, onChange }) {
  const value = muted ? 0 : volume;
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => onChange(muted || value === 0 ? (volume || 1) : 0)}
        className="p-2 hover:bg-white/10 rounded-lg shrink-0"
        aria-label={muted || value === 0 ? 'Sesi aç' : 'Sesi kapat'}
      >
        {muted || value === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onInput={(e) => onChange(parseFloat(e.currentTarget.value))}
        className="w-20 sm:w-28 cursor-pointer accent-primary"
        style={{ touchAction: 'none' }}
        aria-label="Ses seviyesi"
      />
      <span className="text-xs text-white tabular-nums w-9 text-center select-none">{percent}%</span>
    </div>
  );
}