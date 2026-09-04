import { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';

// Genel profil çemberi giriş/çıkış efekti.
// Tüm rol çember efektleri (taç, alev, kalp, nargile, aslan, yıldız, çiçek, elmas, vb.)
// bu bileşeni kullanır — görünüm `theme` prop'u ile belirlenir.
export default function ProfileCircleEntrance({ avatar, name, isEntry, onDone, theme }) {
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
    <div className="fixed inset-0 z-[200] pointer-events-none flex flex-col items-center justify-start gap-5 overflow-hidden pt-[max(env(safe-area-inset-top),12vh)]" style={{ animation: `admin-overlay-fade ${duration}ms ease-out forwards` }}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${theme.glowBg}, transparent 60%)` }} />

      <div className="relative" style={{ animation: 'admin-circle-enter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        {/* Parlama halkası */}
        <div className="absolute -inset-3 rounded-full" style={{
          '--gc1': theme.glowColor,
          '--gc2': theme.glowColor2,
          animation: 'circle-glow-pulse 1.5s ease-in-out infinite',
        }} />

        {/* Üst ikon */}
        {theme.topIcon && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 text-2xl" style={{ animation: 'admin-badge-pop 0.5s ease-out 0.2s both', filter: `drop-shadow(0 0 6px ${theme.topIconGlow})` }}>
            {theme.topIcon}
          </div>
        )}

        {/* Çevre dekorları */}
        {Array.from({ length: theme.decorCount }, (_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2" style={{ transform: `translate(-50%, -50%) rotate(${i * (360 / theme.decorCount)}deg) translateY(-${theme.decorRadius}px)` }}>
            {theme.renderDecoration(i, dying)}
          </div>
        ))}

        {/* Profil fotoğrafı */}
        <div className={`relative w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] rounded-full overflow-hidden border-2 ${theme.borderColor} z-10`}>
          {avatar ? (
            <Image src={avatar} className="w-full h-full" fittingType="fill" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${theme.fallbackBg} flex items-center justify-center text-2xl font-bold ${theme.fallbackText}`}>
              {name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Rozet */}
        <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r ${theme.badgeGradient} text-white ${theme.badgeSize} font-bold tracking-tight z-20 whitespace-nowrap`} style={{ animation: 'admin-badge-pop 0.4s ease-out 0.3s both', boxShadow: `0 0 8px ${theme.badgeGlow}` }}>
          {theme.badge}
        </div>
      </div>

      {/* Bildirim yazısı */}
      <div className="relative text-center px-6" style={{ animation: 'admin-text-enter 0.6s ease-out 0.3s both' }}>
        <p className="text-base sm:text-lg font-extrabold text-white" style={{ textShadow: `0 0 10px ${theme.textGlow}, 0 0 20px ${theme.textGlow2}` }}>
          {name} {isEntry ? 'odaya katıldı' : 'odadan ayrıldı'}
        </p>
      </div>
    </div>
  );
}