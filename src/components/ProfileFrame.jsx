import { FRAME_DEFINITIONS } from '@/lib/roles';
import { Image } from '@/components/ui/image';
import TransparentFrameImage from '@/components/xp/TransparentFrameImage';

const SIZES = { sm: 'w-10 h-10 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-32 h-32 text-3xl' };

export default function ProfileFrame({ frame, children, size = 'md', className = '', avatar, name }) {
  const frameInfo = FRAME_DEFINITIONS[frame];
  if (!frame || !frameInfo?.image_url) return children;
  const dims = SIZES[size] || SIZES.md;

  return (
    <div className={`relative shrink-0 overflow-visible ${dims} ${className}`} title={frameInfo.label}>
      <div className="absolute inset-0 overflow-hidden rounded-full bg-background">
        {avatar
          ? <Image src={avatar} className="h-full w-full object-cover object-center" fittingType="fill" focalPointX={0.5} focalPointY={0.5} />
          : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-white">{(name || '?')[0]}</span>}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[168%] w-[168%] max-w-none -translate-x-1/2 -translate-y-1/2 overflow-visible">
        <TransparentFrameImage src={frameInfo.image_url} animated={false} />
      </div>
    </div>
  );
}