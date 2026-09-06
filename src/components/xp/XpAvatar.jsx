import { Image } from '@/components/ui/image';
import XpFrameArtwork from '@/components/xp/XpFrameArtwork';
import { frameStyle } from '@/lib/xp';

const SIZES = { xs: 'h-8 w-8 text-[10px]', sm: 'h-10 w-10 text-xs', md: 'h-14 w-14 text-sm', lg: 'h-24 w-24 text-3xl' };

export default function XpAvatar({ avatar, name, frame, size = 'sm', className = '' }) {
  const portrait = avatar ? <Image src={avatar} alt={name || 'Profil fotoğrafı'} className="h-full w-full" fittingType="fill" focalPointX={0.5} focalPointY={0.5} />
    : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground">{(name || '?')[0]}</span>;
  if (!frame) return <div className={`relative shrink-0 overflow-hidden rounded-full ${SIZES[size] || SIZES.sm} ${className}`}>{portrait}</div>;
  const style = frameStyle(frame);
  return <div className={`relative shrink-0 overflow-visible ${SIZES[size] || SIZES.sm} ${className}`}>
    <div className="absolute inset-[18%] overflow-hidden rounded-full">{portrait}</div>
    <div className="pointer-events-none absolute inset-0 z-10"><XpFrameArtwork type={frame.style} colors={style.colors} glow={style.glow} animated={frame.animated} imageUrl={frame.image_url} /></div>
  </div>;
}