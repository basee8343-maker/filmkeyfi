import { Image } from '@/components/ui/image';
import { frameStyle } from '@/lib/xp';
import useXp from '@/hooks/useXp';
import XpFrameArtwork from '@/components/xp/XpFrameArtwork';
import TransparentFrameImage from '@/components/xp/TransparentFrameImage';

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
  const hasFrameAsset = Boolean(resolved?.image_url);
  const needsAlphaCleanup = resolved?.image_url?.includes('generated_image');

  return (
    <div className={`relative shrink-0 ${dims.box} ${className}`} title={resolved?.name || ''}>
      {/* Katman 1 — profil fotoğrafı */}
      <div className="absolute inset-[9%] rounded-full overflow-hidden bg-background">
        {avatar
          ? <Image src={avatar} className="w-full h-full object-cover" fittingType="fill" />
          : <span className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-white ${dims.text}`}>{(name || '?')[0]}</span>}
      </div>
      {/* Katman 2 — merkezi ve dışı gerçek alpha şeffaf SVG frame */}
      <div className="pointer-events-none absolute -inset-[26%] w-[152%] h-[152%] z-[2] overflow-visible">
        {needsAlphaCleanup ? (
          <TransparentFrameImage src={resolved.image_url} animated={animated} />
        ) : hasFrameAsset ? (
          <Image src={resolved.image_url} alt="" aria-hidden="true" fittingType="fit" className={`w-full h-full overflow-visible ${animated ? 'xp-frame-asset' : ''}`} />
        ) : (
          <XpFrameArtwork type={resolved?.style} colors={style.colors} glow={style.glow} animated={animated} />
        )}
      </div>
    </div>
  );
}