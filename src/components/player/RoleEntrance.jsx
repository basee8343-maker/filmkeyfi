import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { parseRoleMetadata, parseFrameMetadata, ROLE_DEFINITIONS, getRoleLabelOverride } from '@/lib/roles';
import RoleCharacter from '@/components/role/RoleCharacter';
import FrameEntranceOverlay from '@/components/player/FrameEntranceOverlay';
import AdminFlameEntrance from '@/components/player/AdminFlameEntrance';
import RedHeartEntrance from '@/components/player/RedHeartEntrance';

// Oda giriş/çıkış overlay yöneticisi.
// Öncelik: özel çerçeve > rol karakter animasyonu > hiçbir şey.
// Video overlay sistemi tamamen kaldırıldı.
export default function RoleEntrance({ roomId, joinTrigger = 0 }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [frameCache, setFrameCache] = useState({});
  const timerRef = useRef(null);
  const processedRef = useRef(new Set());

  // Aktif çerçeveleri çek ve cache'le
  useEffect(() => {
    base44.entities.SpecialFrame.filter({ active: true }, '-created_date', 100)
      .then((frames) => {
        const map = {};
        frames.forEach((f) => { map[f.id] = f; });
        setFrameCache(map);
      })
      .catch(() => {});
  }, []);

  const processMessage = (msg) => {
    if (!msg || msg.room_id !== roomId || msg.type !== 'system') return;
    if (processedRef.current.has(msg.id)) return;

    // Önce FRAME metadata'yı çöz
    const frameParsed = parseFrameMetadata(msg.text);
    const roleParsed = parseRoleMetadata(frameParsed.rest);
    const hasFrame = !!frameParsed.frameId;
    const hasRole = roleParsed.hasRole;
    if (!hasFrame && !hasRole) return;

    let remaining = roleParsed.text;
    const isEntry = remaining.includes('odaya katıldı');
    const isExit = remaining.includes('odadan ayrıldı');
    if (!isEntry && !isExit) return;

    // Çerçeve varsa: frame overlay kullan
    if (hasFrame) {
      const frame = frameCache[frameParsed.frameId];
      if (!frame) return; // çerçeve cache'de yoksa — processedRef'e ekleme, cache dolunca tekrar işlensin
      processedRef.current.add(msg.id);
      const title = frameParsed.title || '';
      let displayName = remaining.replace('odaya katıldı', '').replace('odadan ayrıldı', '').replace(/[.\s]/g, '').trim();
      if (title && displayName.startsWith(title)) displayName = displayName.slice(title.length).trim();
      setQueue((q) => [...q.slice(-4), {
        key: msg.id + (isEntry ? 'fin' : 'fout'),
        type: 'frame',
        frame,
        avatar: msg.user_avatar || '',
        displayName,
        title,
        isEntry,
      }]);
      return;
    }

    processedRef.current.add(msg.id);

    const roleKey = roleParsed.roleKey || 'custom';
    const roleDef = ROLE_DEFINITIONS[roleKey || ''];
    const roleLabel = getRoleLabelOverride(roleKey) || roleDef?.label || '';
    const rolePrefix = (roleDef && roleDef.show_in_room) ? `${roleDef.icon} ${roleLabel} ` : '';

    let displayName = remaining;
    if (rolePrefix) displayName = displayName.replace(rolePrefix, '');
    displayName = displayName.replace('odaya katıldı', '').replace('odadan ayrıldı', '').replace(/[.\s]/g, '').trim();

    const isAdminFlame = roleKey === 'admin_helper';
    const isRedHeart = roleKey === 'queen_admin';
    const specialType = isAdminFlame ? 'admin_flame' : isRedHeart ? 'red_heart' : null;
    const suffix = specialType ? (isEntry ? (isAdminFlame ? 'ain' : 'hin') : (isAdminFlame ? 'aout' : 'hout')) : (isEntry ? 'rin' : 'rout');
    setQueue((q) => [...q.slice(-4), {
      key: msg.id + suffix,
      type: specialType || 'role',
      roleKey,
      color: roleParsed.color || roleDef?.color || '#8b5cf6',
      isEntry,
      displayName,
      avatar: msg.user_avatar || '',
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
    const delayTimer = setTimeout(fetchRecent, 2000);
    const unsub = base44.entities.RoomMessage.subscribe((event) => {
      if (event.type !== 'create') return;
      processMessage(event.data);
    });
    return () => { unsub(); clearTimeout(timerRef.current); clearTimeout(delayTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, frameCache]);

  // Katılım tamamlandığında tekrar mesaj çek
  useEffect(() => {
    if (joinTrigger > 0) fetchRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinTrigger]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setQueue((q) => q.slice(1));
    setCurrent(next);
    const duration = next.type === 'frame' ? (next.isEntry ? 3500 : 2100) : (next.type === 'admin_flame' || next.type === 'red_heart') ? (next.isEntry ? 4000 : 3000) : (next.isEntry ? 4500 : 4000);
    timerRef.current = setTimeout(() => setCurrent(null), duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, queue]);

  if (!current) return null;

  if (current.type === 'admin_flame') {
    return (
      <AdminFlameEntrance
        avatar={current.avatar}
        name={current.displayName}
        isEntry={current.isEntry}
        onDone={() => setCurrent(null)}
      />
    );
  }

  if (current.type === 'red_heart') {
    return (
      <RedHeartEntrance
        avatar={current.avatar}
        name={current.displayName}
        isEntry={current.isEntry}
        onDone={() => setCurrent(null)}
      />
    );
  }

  if (current.type === 'frame') {
    return (
      <FrameEntranceOverlay
        frame={current.frame}
        avatar={current.avatar}
        name={current.displayName}
        title={current.title}
        isEntry={current.isEntry}
        onDone={() => setCurrent(null)}
      />
    );
  }

  // Rol karakter animasyonu (çerçeve yoksa)
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