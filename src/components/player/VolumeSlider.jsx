// Çalışan ses kontrolü: hoparlör ikonu + range slider + kalıcı yüzde etiketi.
// Range input mobil/masaüstü güvenilir çalışır; accent-primary ile renkli.
export default function VolumeSlider({ volume, muted, onChange }) {
  const value = muted ? 0 : volume;
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 shrink-0">
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