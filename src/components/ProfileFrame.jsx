import { FRAME_DEFINITIONS } from '@/lib/roles';
import { Image } from '@/components/ui/image';

export default function ProfileFrame({ frame, children, size = 'md', className = '', avatar, name }) {
  const frameInfo = FRAME_DEFINITIONS[frame];
  if (!frame || !frameInfo) return children;

  // Image-based frames (GS, FB, BJK) — frame image overlaid with multiply blend
  if (frameInfo.image) {
    const sizeMap = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-32 h-32' };
    const containerClass = sizeMap[size] || sizeMap.md;

    const avatarEl = avatar
      ? <Image src={avatar} className="w-full h-full object-cover" fittingType="fill" />
      : <span className="w-full h-full rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white">{(name || '?')[0]}</span>;

    return (
      <div className={`relative ${containerClass} rounded-full overflow-hidden bg-white shrink-0 ${className}`}>
        <div className="absolute rounded-full overflow-hidden" style={{ inset: '14%' }}>
          {avatarEl}
        </div>
        <img
          src={frameInfo.image}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ mixBlendMode: 'multiply' }}
          alt=""
        />
      </div>
    );
  }

  // CSS gradient frames (lion, queen_admin, admin_helper, owner, trabzonspor)
  if (!frameInfo.gradient) return children;

  const padding = { sm: 'p-[3px]', md: 'p-1', lg: 'p-1.5' };
  const glow = frameInfo.color ? `0 0 12px -2px ${frameInfo.color}80` : '';

  return (
    <div
      className={`rounded-full ${padding[size] || padding.md} ${className}`}
      style={{
        background: frameInfo.gradient,
        boxShadow: glow,
      }}
    >
      {children}
    </div>
  );
}