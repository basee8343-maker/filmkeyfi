import { Image } from '@/components/ui/image';
import { frameStyle } from '@/lib/xp';
import useXp from '@/hooks/useXp';

// Katman 1: profil fotoğrafı — Katman 2: şeffaf dekoratif çerçeve asset'i (avatarın dışına taşar).
const SIZES = {
  xs: { box: 'w-8 h-8', text: 'text-[10px]' },
  sm: { box: 'w-10 h-10', text: 'text-xs' },
  md: { box: 'w-14 h-14', text: 'text-sm' },
  lg: { box: 'w-24 h-24', text: 'text-3xl' },
};

export default function XpAvatar({ avatar, name, frame, userId, size = 'sm', className = '' }) {
  const auto = useXp(frame || !userId ? [] : [userId]);
  const resolved = frame || auto[userId]?.frame;
  const style = frameStyle(resolved);
  const dims = SIZES[size] || SIZES.sm;
  const animated = resolved?.animated !== false;

  return (
    <div className={`relative shrink-0 ${dims.box} ${className}`} title={resolved?.name || ''}>
      {/* Katman 1 — profil fotoğrafı */}
      <div className="absolute inset-[9%] rounded-full overflow-hidden bg-background">
        {avatar
          ? <Image src={avatar} className="w-full h-full object-cover" fittingType="fill" />
          : <span className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-white ${dims.text}`}>{(name || '?')[0]}</span>}
      </div>
      {/* Katman 2 — gerçek dekoratif çerçeve asset'i, kırpılmadan avatarın dışına taşar */}
      {resolved?.image_url ? (
        <img
          src={resolved.image_url}
          alt=""
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-[26%] w-[152%] h-[152%] max-w-none object-contain z-[2] ${animated ? 'xp-frame-asset' : ''}`}
          style={animated ? { filter: `drop-shadow(0 0 4px ${style.glow})` } : undefined}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 rounded-full z-[2]" style={{ boxShadow: `inset 0 0 0 2px ${style.colors[0]}` }} />
      )}
    </div>
  );
}