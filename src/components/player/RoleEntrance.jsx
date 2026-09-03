import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { parseRoleMetadata, ROLE_DEFINITIONS } from '@/lib/roles';

const ROLE_PARTICLES = {
  founder: { emoji: '🔥', particle: '🔥', anim: 'particle-flame-rise', count: 14, charIn: 'role-char-emerge', charOut: 'role-char-retreat' },
  queen_admin: { emoji: '👑', particle: '❤️', anim: 'particle-heart-float', count: 12, charIn: 'role-char-walk-in', charOut: 'role-char-walk-out' },
  admin_helper: { emoji: '⚡', particle: '⚡', anim: 'particle-lightning-flash', count: 10, charIn: 'role-char-walk-in', charOut: 'role-char-walk-out' },
  prince: { emoji: '👑', particle: '✨', anim: 'particle-gold-sparkle', count: 12, charIn: 'role-char-walk-in', charOut: 'role-char-walk-out' },
  princess: { emoji: '👸', particle: '❤️', anim: 'particle-heart-float', count: 12, charIn: 'role-char-walk-in', charOut: 'role-char-walk-out' },
  vip1: { emoji: '💎', particle: '💎', anim: 'particle-diamond-sparkle', count: 12, charIn: 'role-char-emerge', charOut: 'role-char-retreat' },
  vip2: { emoji: '💜', particle: '💜', anim: 'particle-purple-energy', count: 10, charIn: 'role-char-emerge', charOut: 'role-char-retreat' },
  vip3: { emoji: '🌟', particle: '⭐', anim: 'particle-star-burst', count: 12, charIn: 'role-char-emerge', charOut: 'role-char-retreat' },
  member: { emoji: '👤', particle: '✨', anim: 'particle-subtle-glow', count: 8, charIn: 'role-char-walk-in', charOut: 'role-char-walk-out' },
  custom: { emoji: '✨', particle: '✨', anim: 'particle-subtle-glow', count: 8, charIn: 'role-char-walk-in', charOut: 'role-char-walk-out' },
};

export default function RoleEntrance({ roomId }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsub = base44.entities.RoomMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      const msg = event.data;
      if (!msg || msg.room_id !== roomId || msg.type !== 'system') return;
      const { text, roleKey, color, hasRole } = parseRoleMetadata(msg.text);
      if (!hasRole) return;

      const isEntry = text.includes('odaya katıldı');
      const isExit = text.includes('odadan ayrıldı');
      if (!isEntry && !isExit) return;

      const roleDef = ROLE_DEFINITIONS[roleKey || ''];
      const rolePrefix = (roleDef && roleDef.show_in_room) ? `${roleDef.icon} ${roleDef.label} ` : '';
      const displayName = text.replace(rolePrefix, '').replace(' odaya katıldı.', '').replace(' odadan ayrıldı.', '');

      setQueue((q) => [...q.slice(-4), {
        key: msg.id + (isEntry ? 'in' : 'out'),
        roleKey: roleKey || 'custom',
        color: color || roleDef?.color || '#8b5cf6',
        isEntry,
        displayName,
        roleLabel: roleDef?.show_in_room ? roleDef.label : '',
        roleIcon: roleDef?.icon || '✨',
      }]);
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, [roomId]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setQueue((q) => q.slice(1));
    setCurrent(next);
    const duration = next.isEntry ? 4000 : 3500;
    timerRef.current = setTimeout(() => setCurrent(null), duration);
  }, [current, queue]);

  if (!current) return null;

  const cfg = ROLE_PARTICLES[current.roleKey] || ROLE_PARTICLES.custom;
  const charAnim = current.isEntry ? cfg.charIn : cfg.charOut;
  const textAnim = current.isEntry ? 'role-text-appear' : 'role-text-disappear';
  const action = current.isEntry ? 'odaya katıldı' : 'odadan ayrıldı';
  const overlayDuration = current.isEntry ? '4s' : '3.5s';

  const particles = Array.from({ length: cfg.count }, (_, i) => ({
    left: 10 + Math.random() * 80,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 1.5,
    size: 0.8 + Math.random() * 0.8,
    i,
  }));

  return (
    <div className="absolute inset-0 z-[75] pointer-events-none flex items-center justify-center overflow-hidden" style={{ animation: `role-overlay-fade ${overlayDuration} ease-out forwards` }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${current.color}25, transparent 70%)` }} />
      <div className="absolute inset-0">
        {particles.map((p) => (
          <div key={p.i} className="absolute" style={{
            left: `${p.left}%`,
            bottom: '15%',
            fontSize: `${p.size}rem`,
            animation: `${cfg.anim} ${p.duration}s ease-out ${p.delay}s forwards`,
            filter: `drop-shadow(0 0 8px ${current.color})`,
          }}>
            {cfg.particle}
          </div>
        ))}
      </div>
      <div className="relative" style={{ animation: `${charAnim} 3.5s ease-out forwards` }}>
        <span className="text-7xl block" style={{ filter: `drop-shadow(0 0 25px ${current.color})` }}>
          {cfg.emoji}
        </span>
      </div>
      <div className="absolute bottom-[28%] text-center px-6 w-full" style={{ animation: `${textAnim} 3.5s ease-out forwards` }}>
        {current.roleLabel && (
          <p className="text-lg font-extrabold mb-1" style={{ color: current.color, textShadow: `0 0 15px ${current.color}, 0 0 30px ${current.color}` }}>
            {current.roleIcon} {current.roleLabel}
          </p>
        )}
        <p className="text-2xl font-extrabold text-white" style={{ textShadow: `0 0 15px ${current.color}, 0 0 30px ${current.color}` }}>
          {current.displayName}
        </p>
        <p className="text-sm font-semibold text-white/80 mt-1">{action}</p>
      </div>
    </div>
  );
}