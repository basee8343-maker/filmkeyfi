import { useEffect, useState } from 'react';

const SPLASH_IMAGE = 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/d347c339e_DC7A03E8-EC9C-41E8-9396-51599FADBA05.png';

/**
 * Yönetici odaya girince görünen, etrafında animasyonlu ateşler olan karşılama görseli.
 * Filmi kaplamaz — play tuşunun üstünde, şeffaf zeminde, birkaç sn sonra kaybolur.
 */
export default function AdminRoomWelcome({ onDone }) {
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
      className={`pointer-events-none fixed inset-0 z-[90] flex items-start justify-center pt-[max(env(safe-area-inset-top),2.5rem)] ${exiting ? 'opacity-0 transition-opacity duration-600' : 'animate-[arw-fade_0.5s_ease-out]'}`}
    >
      {/* ÜST ATEŞLER */}
      <FireEdge position="top" />
      {/* ALT ATEŞLER */}
      <FireEdge position="bottom" flip />
      {/* SOL ATEŞLER */}
      <FireEdge position="left" />
      {/* SAĞ ATEŞLER */}
      <FireEdge position="right" flip />

      {/* Merkezi görsel — temiz, pikselsiz, harekli */}
      <div className="relative pointer-events-auto" onClick={dismiss}>
        <div className="relative animate-[arw-pop_0.9s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
          {/* Parıltı halesi */}
          <div className="absolute -inset-5 rounded-full blur-2xl opacity-50" style={{ background: 'radial-gradient(ellipse, rgba(255,140,0,0.55), transparent 70%)' }} />
          <img
            src={SPLASH_IMAGE}
            alt="Admin Hoş Geldin"
            className="relative w-[26vw] max-w-[95px] h-auto object-contain"
            style={{ filter: 'drop-shadow(0 0 16px rgba(255,69,0,0.5))', imageRendering: 'auto' }}
            draggable={false}
          />
          {/* Hafif süzülme animasyonu */}
          <div className="absolute inset-0 animate-[arw-float_3s_ease-in-out_infinite]" style={{ pointerEvents: 'none' }} />
        </div>
      </div>

      <style>{`
        @keyframes arw-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes arw-pop {
          0% { transform: scale(0.4) translateY(30px); opacity: 0; }
          55% { transform: scale(1.1) translateY(-4px); opacity: 1; }
          78% { transform: scale(0.95); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes arw-float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes arw-flame-up {
          0% { transform: translateY(0) scaleY(0.4) scaleX(0.8); opacity: 0; }
          15% { opacity: 0.95; }
          50% { transform: translateY(-20px) scaleY(1.3) scaleX(1); opacity: 0.85; }
          100% { transform: translateY(-44px) scaleY(0.6) scaleX(0.5); opacity: 0; }
        }
        @keyframes arw-flame-down {
          0% { transform: translateY(0) scaleY(0.4) scaleX(0.8); opacity: 0; }
          15% { opacity: 0.95; }
          50% { transform: translateY(20px) scaleY(1.3) scaleX(1); opacity: 0.85; }
          100% { transform: translateY(44px) scaleY(0.6) scaleX(0.5); opacity: 0; }
        }
        @keyframes arw-flame-right {
          0% { transform: translateX(0) scaleY(0.5) scaleX(0.7); opacity: 0; }
          15% { opacity: 0.95; }
          50% { transform: translateX(18px) scaleY(1.2) scaleX(1.1); opacity: 0.85; }
          100% { transform: translateX(40px) scaleY(0.6) scaleX(0.5); opacity: 0; }
        }
        @keyframes arw-flame-left {
          0% { transform: translateX(0) scaleY(0.5) scaleX(0.7); opacity: 0; }
          15% { opacity: 0.95; }
          50% { transform: translateX(-18px) scaleY(1.2) scaleX(1.1); opacity: 0.85; }
          100% { transform: translateX(-40px) scaleY(0.6) scaleX(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function FireBlob({ animation, delay = 0, duration = 1.8, size = 26, left, top }) {
  return (
    <span
      className="absolute"
      style={{
        left,
        top,
        width: size,
        height: size * 1.5,
        marginLeft: -(size / 2),
        marginTop: -(size * 0.75),
        borderRadius: '50% 50% 35% 35% / 70% 70% 30% 30%',
        background: 'radial-gradient(ellipse at center 80%, #fff 0%, #fef3c7 8%, #fbbf24 24%, #f97316 52%, #ff4500 78%, transparent 100%)',
        filter: 'blur(1.5px)',
        animation: `${animation} ${duration}s ease-out ${delay}s infinite`,
        transformOrigin: 'center bottom',
      }}
    />
  );
}

function FireEdge({ position = 'top', flip = false }) {
  const isHorizontal = position === 'top' || position === 'bottom';
  const anim = position === 'top' ? 'arw-flame-up' : position === 'bottom' ? 'arw-flame-down' : position === 'left' ? 'arw-flame-left' : 'arw-flame-right';
  const posClass = position === 'top' ? 'top-[18%]' : position === 'bottom' ? 'bottom-[18%]' : position === 'left' ? 'left-[14%] top-1/2' : 'right-[14%] top-1/2';

  if (isHorizontal) {
    const flames = Array.from({ length: 7 });
    return (
      <div className={`absolute ${posClass} left-0 right-0 h-20 pointer-events-none`}>
        {flames.map((_, i) => (
          <FireBlob
            key={i}
            animation={anim}
            delay={(i * 0.24) % 1.8}
            duration={1.5 + (i % 3) * 0.3}
            size={20 + (i % 3) * 8}
            left={`${(i + 0.5) * (100 / flames.length)}%`}
            top="50%"
          />
        ))}
      </div>
    );
  }
  const flames = Array.from({ length: 5 });
  return (
    <div className={`absolute ${posClass} h-48 w-16 pointer-events-none flex flex-col justify-around`}>
      {flames.map((_, i) => (
        <FireBlob
          key={i}
          animation={anim}
          delay={(i * 0.3) % 1.8}
          duration={1.6 + (i % 3) * 0.25}
          size={22 + (i % 2) * 6}
          left="50%"
          top={`${(i + 0.5) * (100 / flames.length)}%`}
        />
      ))}
    </div>
  );
}