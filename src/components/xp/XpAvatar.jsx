import { Image } from '@/components/ui/image';
import { frameStyle } from '@/lib/xp';
import useXp from '@/hooks/useXp';

const SIZES = {
  xs: { box: 'w-8 h-8', pad: 'p-[2px]', text: 'text-[10px]' },
  sm: { box: 'w-10 h-10', pad: 'p-[3px]', text: 'text-xs' },
  md: { box: 'w-14 h-14', pad: 'p-1', text: 'text-sm' },
  lg: { box: 'w-28 h-28', pad: 'p-1.5', text: 'text-4xl' },
};

// XP çerçeveli avatar — sohbet, izleyiciler, listeler ve profillerde ortak kullanılır.
export default function XpAvatar({ avatar, name, frame, userId, size = 'sm', className = '' }) {
  // Çerçeve verilmediyse kullanıcının XP çerçevesi doğrudan burada çözümlenir (gerçek zamanlı).
  const auto = useXp(frame || !userId ? [] : [userId]);
  const resolved = frame || auto[userId]?.frame;
  const style = frameStyle(resolved);
  const dims = SIZES[size] || SIZES.sm;
  const animated = resolved?.animated !== false;
  const ring = `conic-gradient(${style.colors[0]}, ${style.colors[1]}, ${style.colors[0]})`;
  const inner = avatar
    ? <Image src={avatar} className="w-full h-full object-cover" fittingType="fill" />
    : <span className={`w-full h-full flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-bold text-white ${dims.text}`}>{(name || '?')[0]}</span>;

  return (
    <div className={`relative shrink-0 ${dims.box} ${className}`} title={resolved?.name || ''}>
      <div className={animated ? 'frame-glow-bg' : 'absolute -inset-[2px] rounded-full opacity-50 blur-[5px]'} style={{ background: ring }} />
      <div className={animated ? 'frame-rotating-bg' : 'absolute inset-0 rounded-full'} style={{ background: ring }} />
      <div className={`relative z-[1] w-full h-full ${dims.pad}`}>
        <div className="frame-animated-inner w-full h-full bg-background">{inner}</div>
      </div>
      {resolved?.image_url && <Image src={resolved.image_url} className="pointer-events-none absolute -inset-[12%] z-[2] w-[124%] h-[124%] object-contain" fittingType="fit" />}
      {animated && [0, 1, 2].map((i) => (
        <div key={i} className="frame-sparkle z-[2]" style={{ background: style.colors[i % 2], animationDelay: `${i}s`, boxShadow: `0 0 4px ${style.glow}` }} />
      ))}
    </div>
  );
}