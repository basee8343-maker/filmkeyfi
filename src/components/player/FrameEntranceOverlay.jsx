import { useEffect, useRef, useState } from 'react';

// Özel çerçeve tabanlı oda giriş/çıkış overlay'i.
// PNG çerçeveyi avatarın etrafında gösterir, tema rengine göre yazı efektleri uygular.
// Tam ekran siyah arka plan KULLANMAZ — sadece çerçeve ve yazı görünür.
export default function FrameEntranceOverlay({ frame, avatar, name, title, isEntry, onDone }) {
  const [phase, setPhase] = useState('in'); // in | hold | out
  const timerRef = useRef(null);

  useEffect(() => {
    // Giriş: 0.6s grow + glow, 2.4s hold, 0.5s exit
    // Çıkış: 0.4s appear, 1.2s hold, 0.5s exit
    const holdMs = isEntry ? 2400 : 1200;
    const outMs = 500;
    const inMs = isEntry ? 600 : 400;

    const t1 = setTimeout(() => setPhase('hold'), inMs);
    const t2 = setTimeout(() => setPhase('out'), inMs + holdMs);
    const t3 = setTimeout(() => { onDone?.(); }, inMs + holdMs + outMs);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const themeColor = frame?.theme_color || '#ff4500';
  const textColor = frame?.text_color || '#ffaa00';
  const glowColor = frame?.glow_color || themeColor;
  const imageUrl = frame?.image_url || '';

  const animName = isEntry
    ? (phase === 'out' ? 'frame-exit-scale' : 'frame-entry-scale')
    : (phase === 'out' ? 'frame-exit-scale' : 'frame-entry-quick');

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex flex-col items-center justify-center overflow-hidden">
      {/* Hafif radial glow — siyah arka plan yok */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${themeColor}25, transparent 65%)`,
          animation: phase === 'out' ? 'frame-glow-fade-out 0.5s ease-out forwards' : 'frame-glow-fade-in 0.6s ease-out forwards',
        }}
      />

      {/* Çerçeve + Avatar */}
      <div
        className="relative"
        style={{ animation: `${animName} ${phase === 'out' ? '0.5s' : isEntry ? '0.6s' : '0.4s'} cubic-bezier(0.34,1.56,0.64,1) forwards` }}
      >
        <div className="relative w-[min(72vw,300px)] h-[min(72vw,300px)] flex items-center justify-center">
          {/* Avatar — çerçevenin merkezinde */}
          {avatar ? (
            <div
              className="absolute rounded-full overflow-hidden"
              style={{
                width: '52%',
                height: '52%',
                top: '24%',
                left: '24%',
                boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}80`,
              }}
            >
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className="absolute rounded-full flex items-center justify-center text-4xl font-bold text-white"
              style={{
                width: '52%',
                height: '52%',
                top: '24%',
                left: '24%',
                background: `linear-gradient(135deg, ${themeColor}, ${glowColor})`,
                boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}80`,
              }}
            >
              {(name || '?')[0]?.toUpperCase()}
            </div>
          )}

          {/* PNG çerçeve — transparent merkez, avatar üstte görünür */}
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ filter: `drop-shadow(0 0 15px ${glowColor}) drop-shadow(0 0 30px ${glowColor}80)` }}
          />

          {/* Parçacık efektleri — tema renginde sparkle */}
          {phase !== 'out' && (
            <>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: '6px',
                    height: '6px',
                    top: '50%',
                    left: '50%',
                    background: textColor,
                    boxShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}`,
                    animation: `frame-particle-burst 1.5s ease-out ${i * 0.1}s forwards`,
                    '--angle': `${i * 45}deg`,
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Unvan + İsim + Aksiyon yazısı */}
      <div
        className="absolute bottom-[14%] text-center w-full px-6"
        style={{ animation: phase === 'out' ? 'frame-text-fade-out 0.5s ease-out forwards' : 'frame-text-appear 0.6s ease-out 0.2s forwards', opacity: phase === 'out' ? undefined : 0 }}
      >
        {title && (
          <p
            className="text-2xl sm:text-3xl font-extrabold mb-1 tracking-wide"
            style={{
              color: textColor,
              textShadow: `0 0 12px ${glowColor}, 0 0 24px ${glowColor}, 0 0 48px ${glowColor}, 0 2px 4px rgba(0,0,0,0.8)`,
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </p>
        )}
        {name && (
          <p
            className="text-xl sm:text-2xl font-bold text-white"
            style={{
              textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 2px 4px rgba(0,0,0,0.8)`,
            }}
          >
            {name}
          </p>
        )}
        <p
          className="text-sm font-semibold mt-1"
          style={{
            color: `${textColor}cc`,
            textShadow: `0 0 8px ${glowColor}`,
          }}
        >
          {isEntry ? 'odaya katıldı' : 'odadan ayrıldı'}
        </p>
      </div>
    </div>
  );
}