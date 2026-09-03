import { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';

const FLAME_COUNT = 12;
const FLAME_RADIUS = 55;

// Admin rolü için alev çemberli profil fotoğrafı giriş/çıkış efekti.
// Giriş: "X alevli odaya katıldı" — alevler tam yanar, parlama aktif.
// Çıkış: "X odadan ayrıldı" — alevler yavaşça söner, bildirim kaybolur.
export default function AdminFlameEntrance({ avatar, name, isEntry, onDone }) {
  const [dying, setDying] = useState(false);
  const duration = isEntry ? 4000 : 3000;

  useEffect(() => {
    if (!isEntry) {
      const dieTimer = setTimeout(() => setDying(true), 1500);
      const doneTimer = setTimeout(() => onDone?.(), duration);
      return () => { clearTimeout(dieTimer); clearTimeout(doneTimer); };
    }
    const doneTimer = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(doneTimer);
  }, [isEntry, onDone, duration]);

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex flex-col items-center justify-center gap-5 overflow-hidden" style={{ animation: `admin-overlay-fade ${duration}ms ease-out forwards` }}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(255,69,0,0.15), transparent 60%)' }} />

      {/* Alev çemberi + profil fotoğrafı */}
      <div className="relative" style={{ animation: 'admin-circle-enter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        {/* Parlama halkası */}
        <div className="absolute -inset-3 rounded-full" style={{ animation: 'admin-glow-pulse 1.5s ease-in-out infinite' }} />

        {/* Alevler */}
        {Array.from({ length: FLAME_COUNT }, (_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2" style={{ transform: `translate(-50%, -50%) rotate(${i * (360 / FLAME_COUNT)}deg) translateY(-${FLAME_RADIUS}px)` }}>
            <div className="admin-flame-tongue" style={dying ? {
              animation: 'admin-flame-die 0.8s ease-in forwards',
              animationDelay: `${i * 0.04}s`,
            } : {
              animation: `${i % 2 === 0 ? 'admin-flame-flicker' : 'admin-flame-flicker-2'} ${0.7 + (i % 3) * 0.15}s ease-in-out infinite`,
              animationDelay: `${(i * 0.08) % 0.6}s`,
            }} />
          </div>
        ))}

        {/* Profil fotoğrafı */}
        <div className="relative w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] rounded-full overflow-hidden border-2 border-orange-500/70 z-10">
          {avatar ? (
            <Image src={avatar} className="w-full h-full" fittingType="fill" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-500/40 to-red-600/40 flex items-center justify-center text-2xl font-bold text-orange-200">
              {name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Admin rozeti */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white text-[9px] font-bold tracking-wider z-20 whitespace-nowrap" style={{ animation: 'admin-badge-pop 0.4s ease-out 0.3s both', boxShadow: '0 0 8px rgba(255, 69, 0, 0.8)' }}>
          ADMİN
        </div>
      </div>

      {/* Bildirim yazısı */}
      <div className="relative text-center px-6" style={{ animation: 'admin-text-enter 0.6s ease-out 0.3s both' }}>
        <p className="text-base sm:text-lg font-extrabold text-white" style={{ textShadow: '0 0 10px rgba(255, 69, 0, 0.9), 0 0 20px rgba(255, 140, 0, 0.6)' }}>
          {name} {isEntry ? 'alevli odaya katıldı' : 'odadan ayrıldı'}
        </p>
      </div>
    </div>
  );
}