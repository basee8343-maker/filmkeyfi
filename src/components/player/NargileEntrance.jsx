import { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';

const SMOKE_COUNT = 8;
const SMOKE_RADIUS = 55;

// Nargile çemberi — can_ablam (CAN ABLAM) rolü için.
// Kullanıcı adıyla görünür: "Ali odaya katıldı"
export default function NargileEntrance({ avatar, name, isEntry, onDone }) {
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
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(76,175,80,0.15), transparent 60%)' }} />

      {/* Nargile çemberi + profil fotoğrafı */}
      <div className="relative" style={{ animation: 'admin-circle-enter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        {/* Yeşil parlama */}
        <div className="absolute -inset-3 rounded-full" style={{ animation: 'nargile-glow-pulse 1.5s ease-in-out infinite' }} />

        {/* Nargile ikonu (üstte) */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 text-2xl" style={{ animation: 'admin-badge-pop 0.5s ease-out 0.2s both', filter: 'drop-shadow(0 0 6px rgba(76, 175, 80, 0.9))' }}>
          🪔
        </div>

        {/* Duman parçacıkları */}
        {Array.from({ length: SMOKE_COUNT }, (_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2" style={{ transform: `translate(-50%, -50%) rotate(${i * (360 / SMOKE_COUNT)}deg) translateY(-${SMOKE_RADIUS}px)` }}>
            <div className="rounded-full bg-green-200/40" style={dying ? {
              animation: 'nargile-die 0.8s ease-in forwards',
              animationDelay: `${i * 0.04}s`,
              width: '12px',
              height: '12px',
              filter: 'blur(3px)',
            } : {
              animation: `nargile-puff ${1.2 + (i % 3) * 0.3}s ease-in-out infinite`,
              animationDelay: `${(i * 0.15) % 0.9}s`,
              width: '12px',
              height: '12px',
              filter: 'blur(3px)',
            }} />
          </div>
        ))}

        {/* Profil fotoğrafı */}
        <div className="relative w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] rounded-full overflow-hidden border-2 border-green-500/70 z-10">
          {avatar ? (
            <Image src={avatar} className="w-full h-full" fittingType="fill" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-500/40 to-emerald-600/40 flex items-center justify-center text-2xl font-bold text-green-200">
              {name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Rozet */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[8px] font-bold tracking-tight z-20 whitespace-nowrap" style={{ animation: 'admin-badge-pop 0.4s ease-out 0.3s both', boxShadow: '0 0 8px rgba(76, 175, 80, 0.8)' }}>
          CAN ABLAM
        </div>
      </div>

      {/* Bildirim yazısı */}
      <div className="relative text-center px-6" style={{ animation: 'admin-text-enter 0.6s ease-out 0.3s both' }}>
        <p className="text-base sm:text-lg font-extrabold text-white" style={{ textShadow: '0 0 10px rgba(76, 175, 80, 0.9), 0 0 20px rgba(129, 199, 132, 0.6)' }}>
          {name} {isEntry ? 'odaya katıldı' : 'odadan ayrıldı'}
        </p>
      </div>
    </div>
  );
}