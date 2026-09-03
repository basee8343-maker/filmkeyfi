import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { parseRoleMetadata, ROLE_DEFINITIONS } from '@/lib/roles';
import RoleCharacter from '@/components/role/RoleCharacter';

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
    const duration = next.isEntry ? 4500 : 4000;
    timerRef.current = setTimeout(() => setCurrent(null), duration);
  }, [current, queue]);

  if (!current) return null;

  const action = current.isEntry ? 'odaya katıldı' : 'odadan ayrıldı';
  const overlayDuration = current.isEntry ? '4.5s' : '4s';
  const charAnim = current.isEntry ? 'celebration-char-in' : 'role-text-disappear';

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden" style={{ animation: `celebration-overlay-fade ${overlayDuration} ease-out forwards` }}>
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Radial color glow */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at center, ${current.color}30, transparent 65%)`,
      }} />

      {/* Animated character — full screen */}
      <div className="relative w-[min(75vw,300px)] h-[min(65vh,380px)]" style={{ animation: `${charAnim} 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards` }}>
        <RoleCharacter roleKey={current.roleKey} color={current.color} />
      </div>

      {/* Role label and username */}
      <div className="absolute bottom-[12%] text-center w-full px-6" style={{ animation: 'celebration-text-appear 0.8s ease-out 0.3s forwards' }}>
        {current.roleLabel && (
          <p className="text-xl font-extrabold mb-1" style={{ color: current.color, textShadow: `0 0 15px ${current.color}, 0 0 30px ${current.color}` }}>
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