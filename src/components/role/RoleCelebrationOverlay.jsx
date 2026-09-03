// Full-screen celebration overlay shown when a role is assigned to the current user.
// Listens to User entity realtime updates and displays an animated character.

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { getRoleInfo } from '@/lib/roles';
import { useToast } from '@/components/ui/use-toast';
import RoleCharacter from './RoleCharacter';

export default function RoleCelebrationOverlay() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const prevRoleRef = useRef(null);
  const prevCustomRef = useRef(null);
  const prevFrameRef = useRef(null);
  const [celebration, setCelebration] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    if (prevRoleRef.current === null) {
      prevRoleRef.current = user.display_role || '';
      prevCustomRef.current = JSON.stringify(user.custom_role || null);
      prevFrameRef.current = user.profile_frame || '';
    }

    const unsub = base44.entities.User.subscribe((ev) => {
      if (ev.type !== 'update' || ev.data?.id !== user.id) return;
      const newRole = ev.data.display_role || '';
      const newCustom = JSON.stringify(ev.data.custom_role || null);
      const newFrame = ev.data.profile_frame || '';

      if (newRole !== prevRoleRef.current || newCustom !== prevCustomRef.current) {
        const roleInfo = getRoleInfo({ display_role: newRole, custom_role: ev.data.custom_role });
        if (roleInfo.label) {
          setCelebration({
            key: Date.now(),
            roleKey: roleInfo.key,
            color: roleInfo.color,
            icon: roleInfo.icon,
            label: roleInfo.label,
          });
          fireConfetti(roleInfo.color);
          toast({
            title: `${roleInfo.icon} Yeni Rolünüz: ${roleInfo.label}`,
            description: 'Tebrikler! Yeni rolünüz profilinizde görünüyor.',
          });
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setCelebration(null), 4500);
        } else if (prevRoleRef.current || prevCustomRef.current !== 'null') {
          toast({ title: 'Rolünüz kaldırıldı', description: 'Profiliniz güncellendi.' });
        }
        prevRoleRef.current = newRole;
        prevCustomRef.current = newCustom;
      }

      if (newFrame !== prevFrameRef.current) {
        if (newFrame) {
          fireConfetti('#fbbf24');
          toast({ title: '🖼️ Yeni Çerçeveniz!', description: 'Profil çerçeveniz güncellendi.' });
        }
        prevFrameRef.current = newFrame;
      }
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, [user?.id]);

  if (!celebration) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden" style={{ animation: 'celebration-overlay-in 0.4s ease-out forwards' }}>
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/70" style={{ animation: 'celebration-overlay-fade 4.5s ease-out forwards' }} />

      {/* Radial color glow */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at center, ${celebration.color}30, transparent 65%)`,
        animation: 'celebration-overlay-fade 4.5s ease-out forwards',
      }} />

      {/* Confetti already fired via canvas-confetti (z-index 9999) */}

      {/* Character */}
      <div className="relative w-[min(70vw,280px)] h-[min(60vh,340px)]" style={{ animation: 'celebration-char-in 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        <RoleCharacter roleKey={celebration.roleKey} color={celebration.color} />
      </div>

      {/* Role label and username */}
      <div className="absolute bottom-[15%] text-center w-full px-6" style={{ animation: 'celebration-text-appear 0.8s ease-out 0.3s forwards' }}>
        <p className="text-2xl font-extrabold mb-1" style={{ color: celebration.color, textShadow: `0 0 20px ${celebration.color}, 0 0 40px ${celebration.color}` }}>
          {celebration.icon} {celebration.label}
        </p>
        <p className="text-lg font-bold text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
          {user?.username || user?.full_name || 'Kullanıcı'}
        </p>
        <p className="text-sm text-white/70 mt-1">Yeni rolünüz verildi!</p>
      </div>
    </div>
  );
}

function fireConfetti(color) {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: [color, '#fbbf24', '#ffffff', '#ec4899'],
    zIndex: 10000,
  });
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.5, x: 0.5 },
      colors: [color, '#fbbf24'],
      zIndex: 10000,
    });
  }, 200);
  setTimeout(() => {
    confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0 }, colors: [color, '#ffffff'], zIndex: 10000 });
    confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1 }, colors: [color, '#ffffff'], zIndex: 10000 });
  }, 400);
}