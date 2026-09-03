import { FRAME_DEFINITIONS } from '@/lib/roles';
import { Image } from '@/components/ui/image';

export default function ProfileFrame({ frame, children, size = 'md', className = '', avatar, name }) {
  const frameInfo = FRAME_DEFINITIONS[frame];
  if (!frame || !frameInfo || !frameInfo.colors) return children;

  const sizeMap = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-32 h-32' };
  const containerClass = sizeMap[size] || sizeMap.md;
  const padding = { sm: 'p-[3px]', md: 'p-1', lg: 'p-1.5' };

  const innerEl = avatar
    ? <Image src={avatar} className="w-full h-full object-cover" fittingType="fill" />
    : <span className="w-full h-full rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white">{(name || '?')[0]}</span>;

  return (
    <div className={`relative ${containerClass} ${className} shrink-0`}>
      <div className="frame-glow-bg" style={{ background: `conic-gradient(${frameInfo.colors[0]}, ${frameInfo.colors[1]}, ${frameInfo.colors[0]})` }} />
      <div className="frame-rotating-bg" style={{ background: `conic-gradient(${frameInfo.colors[0]}, ${frameInfo.colors[1]}, ${frameInfo.colors[0]})` }} />
      <div className={`relative ${padding[size] || padding.md} w-full h-full z-[1]`}>
        <div className="frame-animated-inner w-full h-full bg-background">
          {innerEl}
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="frame-sparkle" style={{
          background: frameInfo.colors[i % 2],
          animationDelay: `${i * 1}s`,
          boxShadow: `0 0 4px ${frameInfo.colors[i % 2]}`,
        }} />
      ))}
    </div>
  );
}