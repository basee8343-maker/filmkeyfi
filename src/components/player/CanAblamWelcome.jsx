import { useEffect, useState } from 'react';

const SPLASH_IMAGE = 'https://base44.app/api/apps/6a77d66e4da6de214628ee62/files/mp/public/6a77d66e4da6de214628ee62/be51edb99_can-ablam-gercek-seffaf.png';

/**
 * "Can Ablam" rolündeki kullanıcı odaya girince görünen, etrafında animasyonlu
 * kalpler olan karşılama görseli. Filmi kaplamaz — play tuşunun üstünde,
 * şeffaf zeminde, birkaç sn sonra kaybolur.
 */
export default function CanAblamWelcome({ onDone }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(dismiss, 5500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDone?.(), 600);
  };

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[90] flex items-start justify-center pt-[max(env(safe-area-inset-top),2.5rem)] ${exiting ? 'opacity-0 transition-opacity duration-600' : 'animate-[cab-fade_0.5s_ease-out]'}`}
    >
      {/* ÜST KALPLER */}
      <HeartEdge position="top" />
      {/* ALT KALPLER */}
      <HeartEdge position="bottom" />
      {/* SOL KALPLER */}
      <HeartEdge position="left" />
      {/* SAĞ KALPLER */}
      <HeartEdge position="right" />

      {/* Merkezi görsel — temiz, pikselsiz, harekli */}
      <div className="relative pointer-events-auto" onClick={dismiss}>
        <div className="relative animate-[cab-pop_0.9s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
          {/* Kırmızı kalp parıltı halesi */}
          <div className="absolute -inset-5 rounded-full blur-2xl opacity-50" style={{ background: 'radial-gradient(ellipse, rgba(255,23,68,0.55), transparent 70%)' }} />
          <img
            src={SPLASH_IMAGE}
            alt="Can Ablam"
            className="relative w-[52vw] max-w-[220px] h-auto object-contain"
            style={{ filter: 'drop-shadow(0 0 16px rgba(255,23,68,0.5))', imageRendering: 'auto' }}
            draggable={false}
          />
          {/* Hafif süzülme animasyonu */}
          <div className="absolute inset-0 animate-[cab-float_3s_ease-in-out_infinite]" style={{ pointerEvents: 'none' }} />
        </div>
      </div>

      <style>{`
        @keyframes cab-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cab-pop {
          0% { transform: scale(0.4) translateY(30px); opacity: 0; }
          55% { transform: scale(1.1) translateY(-4px); opacity: 1; }
          78% { transform: scale(0.95); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes cab-float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes cab-heart-up {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateY(-22px) scale(1.15); opacity: 0.9; }
          100% { transform: translateY(-50px) scale(0.6); opacity: 0; }
        }
        @keyframes cab-heart-down {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateY(22px) scale(1.15); opacity: 0.9; }
          100% { transform: translateY(50px) scale(0.6); opacity: 0; }
        }
        @keyframes cab-heart-right {
          0% { transform: translateX(0) scale(0.5); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(20px) scale(1.15); opacity: 0.9; }
          100% { transform: translateX(46px) scale(0.6); opacity: 0; }
        }
        @keyframes cab-heart-left {
          0% { transform: translateX(0) scale(0.5); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(-20px) scale(1.15); opacity: 0.9; }
          100% { transform: translateX(-46px) scale(0.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function HeartBlob({ animation, delay = 0, duration = 1.8, size = 22, left, top }) {
  return (
    <span
      className="absolute leading-none"
      style={{
        left,
        top,
        fontSize: `${size}px`,
        marginLeft: -(size / 2),
        marginTop: -(size / 2),
        animation: `${animation} ${duration}s ease-out ${delay}s infinite`,
        filter: 'drop-shadow(0 0 5px rgba(255,23,68,0.65))',
      }}
    >❤️</span>
  );
}

function HeartEdge({ position = 'top' }) {
  const isHorizontal = position === 'top' || position === 'bottom';
  const anim = position === 'top' ? 'cab-heart-up' : position === 'bottom' ? 'cab-heart-down' : position === 'left' ? 'cab-heart-left' : 'cab-heart-right';
  const posClass = position === 'top' ? 'top-[18%]' : position === 'bottom' ? 'bottom-[18%]' : position === 'left' ? 'left-[14%] top-1/2' : 'right-[14%] top-1/2';

  if (isHorizontal) {
    const hearts = Array.from({ length: 7 });
    return (
      <div className={`absolute ${posClass} left-0 right-0 h-20 pointer-events-none`}>
        {hearts.map((_, i) => (
          <HeartBlob
            key={i}
            animation={anim}
            delay={(i * 0.24) % 1.8}
            duration={1.5 + (i % 3) * 0.3}
            size={18 + (i % 3) * 6}
            left={`${(i + 0.5) * (100 / hearts.length)}%`}
            top="50%"
          />
        ))}
      </div>
    );
  }
  const hearts = Array.from({ length: 5 });
  return (
    <div className={`absolute ${posClass} h-48 w-16 pointer-events-none flex flex-col justify-around`}>
      {hearts.map((_, i) => (
        <HeartBlob
          key={i}
          animation={anim}
          delay={(i * 0.3) % 1.8}
          duration={1.6 + (i % 3) * 0.25}
          size={20 + (i % 2) * 6}
          left="50%"
          top={`${(i + 0.5) * (100 / hearts.length)}%`}
        />
      ))}
    </div>
  );
}