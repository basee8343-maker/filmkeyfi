import { FRAME_DEFINITIONS } from '@/lib/roles';

export default function ProfileFrame({ frame, children, size = 'md', className = '' }) {
  const frameInfo = FRAME_DEFINITIONS[frame];
  if (!frame || !frameInfo || !frameInfo.gradient) return children;

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