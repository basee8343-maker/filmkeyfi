import { useState } from 'react';
import { FRAME_DEFINITIONS } from '@/lib/roles';
import { Image } from '@/components/ui/image';
import TransparentFrameImage from '@/components/xp/TransparentFrameImage';
import FramedPortrait from '@/components/profile/FramedPortrait';

const SIZES = {
  xs: { avatar: 'h-7 w-7 text-[10px]', sprite: 'h-12 w-12' },
  sm: { avatar: 'h-10 w-10 text-xs', sprite: 'h-20 w-[4.25rem]' },
  md: { avatar: 'h-12 w-12 text-sm', sprite: 'h-24 w-20' },
  lg: { avatar: 'h-32 w-32 text-3xl', sprite: 'h-60 w-56' },
};

export default function ProfileFrame({ frame, children, size = 'md', className = '', avatar, name, frameScale = 100 }) {
  const [frameMetrics, setFrameMetrics] = useState(null);
  const frameInfo = FRAME_DEFINITIONS[frame];
  const dims = SIZES[size] || SIZES.md;
  if (frameInfo?.prepared) return <FramedPortrait info={frameInfo} avatar={avatar} name={name} size={size} className={className} scale={frameScale} />;
  if (!frame || !frameInfo?.image_url) return children || (
    <div className={`relative shrink-0 overflow-hidden rounded-full bg-background ${dims.avatar} ${className}`}>
      {avatar
        ? <Image src={avatar} className="h-full w-full object-cover object-center" fittingType="fill" focalPointX={0.5} focalPointY={0.5} />
        : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-white">{(name || '?')[0]}</span>}
    </div>
  );
  const artworkClass = frameInfo.sprite
    ? 'h-[240%] w-[168%] -translate-x-1/2 -translate-y-[42%]'
    : 'h-[168%] w-[168%] -translate-x-1/2 -translate-y-1/2';
  const avatarScale = frameMetrics?.avatarScale || 1;

  return (
    <div className={`relative shrink-0 overflow-visible ${frameInfo.sprite ? dims.sprite : dims.avatar} ${className}`} title={frameInfo.label}>
      <div className={`relative mx-auto ${dims.avatar}`}>
        <div className="absolute inset-0 overflow-hidden rounded-full bg-background" style={{ transform: `scale(${avatarScale})` }}>
          {avatar
            ? <Image src={avatar} className="h-full w-full object-cover object-center" fittingType="fill" focalPointX={0.5} focalPointY={0.5} />
            : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-white">{(name || '?')[0]}</span>}
        </div>
        <div className={`pointer-events-none absolute left-1/2 top-1/2 z-[2] max-w-none overflow-visible ${artworkClass}`}>
          <TransparentFrameImage src={frameInfo.image_url} crop={frameInfo.sprite} animated={false} onMetrics={setFrameMetrics} />
        </div>
      </div>
    </div>
  );
}