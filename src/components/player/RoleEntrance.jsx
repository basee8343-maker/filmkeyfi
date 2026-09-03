import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { parseRoleMetadata, ROLE_DEFINITIONS, getRoleLabelOverride } from '@/lib/roles';
import RoleCharacter from '@/components/role/RoleCharacter';
import FounderVideoOverlay from '@/components/player/FounderVideoOverlay';
import { useAuth } from '@/lib/AuthContext';

export default function RoleEntrance({ roomId }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const timerRef = useRef(null);
  const { publicSettings } = useAuth();
  const founderEntryVideo = publicSettings?.founder_entry_video || '';
  const founderExitVideo = publicSettings?.founder_exit_video || '';

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
      const roleLabel = getRoleLabelOverride(roleKey) || roleDef?.label || '';
      const rolePrefix = (roleDef && roleDef.show_in_room) ? `${roleDef.icon} ${roleLabel} ` : '';

      // Extract display name — handle hide_username_entry (no name in text)
      let remaining = text;
      if (rolePrefix) remaining = remaining.replace(rolePrefix, '');
      const displayName = remaining.replace('odaya katıldı', '').replace('odadan ayrıldı', '').replace(/[.\s]/g, '').trim();

      setQueue((q) => [...q.slice(-4), {
        key: msg.id + (isEntry ? 'in' : 'out'),
        roleKey: roleKey || 'custom',
        color: color || roleDef?.color || '#8b5cf6',
        isEntry,
        displayName,
        roleLabel: roleDef?.show_in_room ? roleLabel : '',
        roleIcon: roleDef?.icon || '✨',
        hideUsername: roleDef?.hide_username_entry || false,
      }]);
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, [roomId]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setQueue((q) => q.slice(1));
    setCurrent(next);
    const isFounderVideo = next.roleKey === 'founder' && (next.isEntry ? founderEntryVideo : founderExitVideo);
    const duration = isFounderVideo ? 6000 : (next.isEntry ? 4500 : 4000);
    timerRef.current = setTimeout(() => setCurrent(null), duration);
  }, [current, queue, founderEntryVideo, founderExitVideo]);

  if (!current) return null;

  // Kurucu rolü için gerçek AI videosu oynat
  const founderVideoUrl = current.isEntry ? founderEntryVideo : founderExitVideo;
  if (current.roleKey === 'founder' && founderVideoUrl) {
    return <FounderVideoOverlay url={founderVideoUrl} isEntry={current.isEntry} />;
  }

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
        {/* Only show username if NOT hidden */}
        {!current.hideUsername && current.displayName && (
          <p className="text-2xl font-extrabold text-white" style={{ textShadow: `0 0 15px ${current.color}, 0 0 30px ${current.color}` }}>
            {current.displayName}
          </p>
        )}
        <p className="text-sm font-semibold text-white/80 mt-1">{action}</p>
      </div>
    </div>
  );
}