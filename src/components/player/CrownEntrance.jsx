import { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';

const SPARKLE_COUNT = 8;
const SPARKLE_RADIUS = 55;

// Kral taçlı çember — founder (ADMİN / KURUCU) rolü için.
// Rol ismiyle görünür: "ADMİN / KURUCU odaya katıldı"
export default function CrownEntrance({ avatar, name, isEntry, onDone }) {
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
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.15), transparent 60%)' }} />

      {/* Taç çemberi + profil fotoğrafı */}
      <div className="relative" style={{ animation: 'admin-circle-enter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        {/* Altın parlama */}
        <div className="absolute -inset-3 rounded-full" style={{ animation: 'crown-glow-pulse 1.5s ease-in-out infinite' }} />

        {/* Taç (üstte) */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 text-2xl" style={{ animation: 'admin-badge-pop 0.5s ease-out 0.2s both', filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.9))' }}>
          👑
        </div>

        {/* Yıldız parıltıları */}
        {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2" style={{ transform: `translate(-50%, -50%) rotate(${i * (360 / SPARKLE_COUNT)}deg) translateY(-${SPARKLE_RADIUS}px)` }}>
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="#fde047" style={dying ? {
              animation: 'crown-die 0.8s ease-in forwards',
              animationDelay: `${i * 0.04}s`,
            } : {
              animation: `crown-sparkle ${0.8 + (i % 3) * 0.15}s ease-in-out infinite`,
              animationDelay: `${(i * 0.1) % 0.6}s`,
              filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))',
            }}>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
        ))}

        {/* Profil fotoğrafı */}
        <div className="relative w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] rounded-full overflow-hidden border-2 border-yellow-500/70 z-10">
          {avatar ? (
            <Image src={avatar} className="w-full h-full" fittingType="fill" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-yellow-500/40 to-amber-600/40 flex items-center justify-center text-2xl font-bold text-yellow-200">
              {name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Rozet */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[7px] font-bold tracking-tight z-20 whitespace-nowrap" style={{ animation: 'admin-badge-pop 0.4s ease-out 0.3s both', boxShadow: '0 0 8px rgba(251, 191, 36, 0.8)' }}>
          ADMİN / KURUCU
        </div>
      </div>

      {/* Bildirim yazısı */}
      <div className="relative text-center px-6" style={{ animation: 'admin-text-enter 0.6s ease-out 0.3s both' }}>
        <p className="text-base sm:text-lg font-extrabold text-white" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.9), 0 0 20px rgba(252, 211, 77, 0.6)' }}>
          {name} {isEntry ? 'odaya katıldı' : 'odadan ayrıldı'}
        </p>
      </div>
    </div>
  );
}