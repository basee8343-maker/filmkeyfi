import { getRoleInfo } from '@/lib/roles';

export default function RoleBadge({ user, size = 'sm', showLabel = true, className = '' }) {
  const roleInfo = getRoleInfo(user);
  if (!roleInfo || !roleInfo.label) return null;

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    md: 'text-[10px] px-2 py-0.5 gap-1',
    lg: 'text-xs px-2.5 py-1 gap-1',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold whitespace-nowrap ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${roleInfo.color}25`,
        color: roleInfo.color,
        boxShadow: roleInfo.neon ? `0 0 6px -1px ${roleInfo.color}80` : 'none',
      }}
    >
      <span>{roleInfo.icon}</span>
      {showLabel && <span>{roleInfo.label}</span>}
    </span>
  );
}