import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { getRoleInfo } from '@/lib/roles';
import { useToast } from '@/components/ui/use-toast';

export default function useRoleCelebration() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const prevRoleRef = useRef(null);
  const prevCustomRef = useRef(null);
  const prevFrameRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    // Initialize refs with current values (don't celebrate on first load)
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

      // Role or custom role changed
      if (newRole !== prevRoleRef.current || newCustom !== prevCustomRef.current) {
        const roleInfo = getRoleInfo({ display_role: newRole, custom_role: ev.data.custom_role });
        if (roleInfo.label) {
          fireConfetti(roleInfo.color);
          toast({
            title: `${roleInfo.icon} Yeni Rolünüz: ${roleInfo.label}`,
            description: 'Tebrikler! Yeni rolünüz profilinizde görünüyor.',
          });
        } else if (prevRoleRef.current || prevCustomRef.current !== 'null') {
          // Role was removed
          toast({ title: 'Rolünüz kaldırıldı', description: 'Profiliniz güncellendi.' });
        }
        prevRoleRef.current = newRole;
        prevCustomRef.current = newCustom;
      }

      // Frame changed
      if (newFrame !== prevFrameRef.current) {
        if (newFrame) {
          fireConfetti('#fbbf24');
          toast({
            title: '🖼️ Yeni Çerçeveniz!',
            description: 'Profil çerçeveniz güncellendi.',
          });
        }
        prevFrameRef.current = newFrame;
      }
    });
    return unsub;
  }, [user?.id]);
}

function fireConfetti(color) {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: [color, '#fbbf24', '#ffffff', '#ec4899'],
    zIndex: 9999,
  });
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.5, x: 0.5 },
      colors: [color, '#fbbf24'],
      zIndex: 9999,
    });
  }, 200);
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: [color, '#ffffff'],
      zIndex: 9999,
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: [color, '#ffffff'],
      zIndex: 9999,
    });
  }, 400);
}