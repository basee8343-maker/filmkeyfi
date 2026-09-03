import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { parseRoleMetadata, ROLE_DEFINITIONS, getRoleLabelOverride } from '@/lib/roles';
import RoleCharacter from '@/components/role/RoleCharacter';
import RoleVideoOverlay from '@/components/player/RoleVideoOverlay';
import { useAuth } from '@/lib/AuthContext';

// Rol → video config key eşlemesi
const ROLE_VIDEO_KEYS = {
  founder: { entry: 'founder_entry_video', exit: 'founder_exit_video' },
  queen_admin: { entry: 'role_video_queen_admin_entry' },
  can_abim: { entry: 'role_video_can_abim_entry' },
  can_ablam: { entry: 'role_video_can_ablam_entry' },
  nargileciler: { entry: 'role_video_nargileciler_entry' },
};

export default function RoleEntrance({ roomId }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const timerRef = useRef(null);
  const processedRef = useRef(new Set());
  const { publicSettings } = useAuth();

  const getVideoUrl = (roleKey, isEntry) => {
    const keys = ROLE_VIDEO_KEYS[roleKey];
    if (!keys) return '';
    const key = isEntry ? keys.entry : keys.exit;
    return key ? (publicSettings?.[key] || '') : '';
  };

  const processMessage = (msg) => {
    if (!msg || msg.room_id !== roomId || msg.type !== 'system') return;
    if (processedRef.current.has(msg.id)) return;
    const { text, roleKey, color, hasRole } = parseRoleMetadata(msg.text);
    if (!hasRole) return;

    const isEntry = text.includes('odaya katıldı');
    const isExit = text.includes('odadan ayrıldı');
    if (!isEntry && !isExit) return;

    processedRef.current.add(msg.id);

    const roleDef = ROLE_DEFINITIONS[roleKey || ''];
    const roleLabel = getRoleLabelOverride(roleKey) || roleDef?.label || '';
    const rolePrefix = (roleDef && roleDef.show_in_room) ? `${roleDef.icon} ${roleLabel} ` : '';

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
  };

  const fetchRecent = () => {
    base44.entities.RoomMessage.filter({ room_id: roomId, type: 'system' }, '-created_date', 15)
      .then((msgs) => {
        const now = Date.now();
        const recent = msgs
          .filter((m) => now - new Date(m.created_date).getTime() < 20000)
          .reverse();
        recent.forEach(processMessage);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchRecent();
    // Gecikmeli tekrar çekme — kullanıcının kendi katılım mesajı,
    // WebSocket aboneliği hazır olmadan önce oluşturulursa yakalar.
    const delayTimer = setTimeout(fetchRecent, 2000);

    const unsub = base44.entities.RoomMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      processMessage(event.data);
    });
    return () => { unsub(); clearTimeout(timerRef.current); clearTimeout(delayTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setQueue((q) => q.slice(1));
    setCurrent(next);
    const videoUrl = getVideoUrl(next.roleKey, next.isEntry);
    const duration = videoUrl ? 6000 : (next.isEntry ? 4500 : 4000);
    timerRef.current = setTimeout(() => setCurrent(null), duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, queue, publicSettings]);

  if (!current) return null;

  const videoUrl = getVideoUrl(current.roleKey, current.isEntry);
  if (videoUrl) {
    const roleLabel = current.roleLabel || ROLE_DEFINITIONS[current.roleKey]?.label || '';
    const title = roleLabel
      ? `${roleLabel} ${current.isEntry ? 'ODAYA KATILDI' : 'ODADAN AYRILDI'}`
      : (current.isEntry ? 'ODAYA KATILDI' : 'ODADAN AYRILDI');
    return <RoleVideoOverlay url={videoUrl} isEntry={current.isEntry} title={title} color={current.color} />;
  }

  // Video yoksa karakter animasyonuna düş
  const action = current.isEntry ? 'odaya katıldı' : 'odadan ayrıldı';
  const overlayDuration = current.isEntry ? '4.5s' : '4s';
  const charAnim = current.isEntry ? 'celebration-char-in' : 'role-text-disappear';

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden" style={{ animation: `celebration-overlay-fade ${overlayDuration} ease-out forwards` }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at center, ${current.color}30, transparent 65%)`,
      }} />
      <div className="relative w-[min(75vw,300px)] h-[min(65vh,380px)]" style={{ animation: `${charAnim} 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards` }}>
        <RoleCharacter roleKey={current.roleKey} color={current.color} />
      </div>
      <div className="absolute bottom-[12%] text-center w-full px-6" style={{ animation: 'celebration-text-appear 0.8s ease-out 0.3s forwards' }}>
        {current.roleLabel && (
          <p className="text-xl font-extrabold mb-1" style={{ color: current.color, textShadow: `0 0 15px ${current.color}, 0 0 30px ${current.color}` }}>
            {current.roleIcon} {current.roleLabel}
          </p>
        )}
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