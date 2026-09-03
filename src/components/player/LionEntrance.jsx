import { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';

const MANE_COUNT = 12;
const MANE_RADIUS = 52;

// Aslan çemberi — can_abim (CAN ABİM) rolü için.
// Kullanıcı adıyla görünür: "Ali odaya katıldı"
export default function LionEntrance({ avatar, name, isEntry, onDone }) {
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
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.15), transparent 60%)' }} />

      {/* Aslan çemberi + profil fotoğrafı */}
      <div className="relative" style={{ animation: 'admin-circle-enter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        {/* Altın parlama */}
        <div className="absolute -inset-3 rounded-full" style={{ animation: 'lion-glow-pulse 1.5s ease-in-out infinite' }} />

        {/* Aslan ikonu (üstte) */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 text-2xl" style={{ animation: 'admin-badge-pop 0.5s ease-out 0.2s both', filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.9))' }}>
          🦁
        </div>

        {/* Yeke (mane) sivri uçları */}
        {Array.from({ length: MANE_COUNT }, (_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2" style={{ transform: `translate(-50%, -50%) rotate(${i * (360 / MANE_COUNT)}deg) translateY(-${MANE_RADIUS}px)` }}>
            <svg viewBox="0 0 12 16" className="w-3 h-4" fill="#f59e0b" style={dying ? {
              animation: 'lion-die 0.8s ease-in forwards',
              animationDelay: `${i * 0.04}s`,
            } : {
              animation: `lion-mane ${0.8 + (i % 3) * 0.15}s ease-in-out infinite`,
              animationDelay: `${(i * 0.08) % 0.6}s`,
              filter: 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.8))',
            }}>
              <path d="M6 0L12 16H0z" />
            </svg>
          </div>
        ))}

        {/* Profil fotoğrafı */}
        <div className="relative w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] rounded-full overflow-hidden border-2 border-amber-500/70 z-10">
          {avatar ? (
            <Image src={avatar} className="w-full h-full" fittingType="fill" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-500/40 to-orange-600/40 flex items-center justify-center text-2xl font-bold text-amber-200">
              {name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Rozet */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[8px] font-bold tracking-tight z-20 whitespace-nowrap" style={{ animation: 'admin-badge-pop 0.4s ease-out 0.3s both', boxShadow: '0 0 8px rgba(245, 158, 11, 0.8)' }}>
          CAN ABİM
        </div>
      </div>

      {/* Bildirim yazısı */}
      <div className="relative text-center px-6" style={{ animation: 'admin-text-enter 0.6s ease-out 0.3s both' }}>
        <p className="text-base sm:text-lg font-extrabold text-white" style={{ textShadow: '0 0 10px rgba(245, 158, 11, 0.9), 0 0 20px rgba(251, 191, 36, 0.6)' }}>
          {name} {isEntry ? 'odaya katıldı' : 'odadan ayrıldı'}
        </p>
      </div>
    </div>
  );
}