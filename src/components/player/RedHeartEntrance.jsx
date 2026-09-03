import { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';

const HEART_COUNT = 8;
const HEART_RADIUS = 55;

// Kırmızı Kalp rolü için kalpli kırmızı çemberli profil fotoğrafı giriş/çıkış efekti.
// Giriş: "X odaya katıldı" — kalpler atar, kırmızı parlama aktif.
// Çıkış: "X odadan ayrıldı" — kalpler yavaşça söner, bildirim kaybolur.
export default function RedHeartEntrance({ avatar, name, isEntry, onDone }) {
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
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(255,23,68,0.15), transparent 60%)' }} />

      {/* Kalp çemberi + profil fotoğrafı */}
      <div className="relative" style={{ animation: 'admin-circle-enter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        {/* Kırmızı parlama */}
        <div className="absolute -inset-3 rounded-full" style={{ animation: 'heart-glow-pulse 1.5s ease-in-out infinite' }} />

        {/* Kalpler */}
        {Array.from({ length: HEART_COUNT }, (_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2" style={{ transform: `translate(-50%, -50%) rotate(${i * (360 / HEART_COUNT)}deg) translateY(-${HEART_RADIUS}px)` }}>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#ff1744" style={dying ? {
              animation: 'heart-die 0.8s ease-in forwards',
              animationDelay: `${i * 0.04}s`,
            } : {
              animation: `heart-beat ${0.8 + (i % 3) * 0.15}s ease-in-out infinite`,
              animationDelay: `${(i * 0.1) % 0.6}s`,
              filter: 'drop-shadow(0 0 4px rgba(255, 23, 68, 0.8))',
            }}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        ))}

        {/* Profil fotoğrafı */}
        <div className="relative w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] rounded-full overflow-hidden border-2 border-red-500/70 z-10">
          {avatar ? (
            <Image src={avatar} className="w-full h-full" fittingType="fill" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-500/40 to-pink-600/40 flex items-center justify-center text-2xl font-bold text-red-200">
              {name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Rozet */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white text-[8px] font-bold tracking-tight z-20 whitespace-nowrap" style={{ animation: 'admin-badge-pop 0.4s ease-out 0.3s both', boxShadow: '0 0 8px rgba(255, 23, 68, 0.8)' }}>
          ADMİN KRALİÇESİ
        </div>
      </div>

      {/* Bildirim yazısı */}
      <div className="relative text-center px-6" style={{ animation: 'admin-text-enter 0.6s ease-out 0.3s both' }}>
        <p className="text-base sm:text-lg font-extrabold text-white" style={{ textShadow: '0 0 10px rgba(255, 23, 68, 0.9), 0 0 20px rgba(255, 105, 135, 0.6)' }}>
          {name} {isEntry ? 'odaya katıldı' : 'odadan ayrıldı'}
        </p>
      </div>
    </div>
  );
}