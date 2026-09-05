import { useState } from 'react';
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
  const [frameMetrics, setFrameMetrics] = useState(null);
  const auto = useXp(frame || !userId ? [] : [userId]);
  const resolved = frame || auto[userId]?.frame;
  const style = frameStyle(resolved);
  const dims = SIZES[size] || SIZES.sm;
  const hasFrameAsset = Boolean(resolved?.image_url);
  const needsAlphaCleanup = hasFrameAsset && !/\.svg(?:\?|$)/i.test(resolved.image_url);
  const avatarScale = hasFrameAsset ? (frameMetrics?.avatarScale || 1) : 1.22;

  return (
    <div className={`relative shrink-0 ${dims.box} ${className}`} title={resolved?.name || ''}>
      {/* Katman 1 — profil fotoğrafı */}
      <div className="absolute inset-0 rounded-full overflow-hidden bg-background" style={{ transform: `scale(${avatarScale})` }}>
        {avatar
          ? <Image src={avatar} className="w-full h-full object-cover object-center" fittingType="fill" focalPointX={0.5} focalPointY={0.5} />
          : <span className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-white ${dims.text}`}>{(name || '?')[0]}</span>}
      </div>
      {/* Katman 2 — merkezi ve dışı gerçek alpha şeffaf SVG frame */}
      <div className="xp-frame-luminous pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[168%] w-[168%] max-w-none -translate-x-1/2 -translate-y-1/2 overflow-visible">
        {needsAlphaCleanup ? (
          <TransparentFrameImage src={resolved.image_url} animated={false} onMetrics={setFrameMetrics} />
        ) : hasFrameAsset ? (
          <Image src={resolved.image_url} alt="" aria-hidden="true" fittingType="fit" className="w-full h-full overflow-visible" />
        ) : (
          <XpFrameArtwork type={resolved?.style} colors={style.colors} glow={style.glow} animated={false} />
        )}
      </div>
    </div>
  );
}