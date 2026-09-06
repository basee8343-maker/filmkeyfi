import { useEffect, useState } from 'react';

const SPLASH_IMAGE = 'https://base44.app/api/apps/6a77d66e4da6de214628ee62/files/mp/public/6a77d66e4da6de214628ee62/10f62b90c_can-abim-original-transparent.png';

/**
 * Can Abim (KRAL TURGAY) odaya girince play tuşunun üstünde, filmi kapatmadan
 * şeffaf zeminde beliren şimşek efektli karşılama görseli.
 */
export default function CanAbimWelcome({ onDone }) {
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
    <div className={`pointer-events-none fixed inset-0 z-[90] flex items-end justify-center pb-[22vh] ${exiting ? 'opacity-0 transition-opacity duration-500' : 'animate-[cab-fade_.4s_ease-out]'}`}>
      {/* Hafif mavi flash overlay */}
      <div className="absolute inset-0 bg-blue-500/5 animate-[cab-flash_1.4s_ease-in-out_infinite]" />

      {/* Dört yönden şimşek */}
      <BoltEdge position="top" />
      <BoltEdge position="bottom" />
      <BoltEdge position="left" />
      <BoltEdge position="right" />

      {/* Merkezi görsel — şeffaf, filmi kapatmaz */}
      <button type="button" onClick={dismiss} className="pointer-events-auto relative z-10 border-0 bg-transparent p-0" aria-label="Karşılamayı kapat">
        <div className="relative animate-[cab-pop_.9s_cubic-bezier(.34,1.56,.64,1)_forwards]">
          {/* Mavi parıltı halesi */}
          <div className="absolute -inset-6 rounded-full blur-3xl opacity-50" style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.55), transparent 70%)' }} />
          <img
            src={SPLASH_IMAGE}
            alt="Can Abim - Kral Turgay"
            className="relative w-[74vw] max-w-[330px] h-auto object-contain"
            style={{ filter: 'drop-shadow(0 0 16px rgba(59,130,246,0.5))' }}
            draggable={false}
          />
        </div>
      </button>

      <style>{`
        @keyframes cab-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cab-pop {
          0% { transform: scale(0.4) translateY(30px); opacity: 0; }
          55% { transform: scale(1.1) translateY(-4px); opacity: 1; }
          78% { transform: scale(0.95); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes cab-flash {
          0%,8%,14%,45%,51%,100% { opacity: 0 }
          10%,48% { opacity: .7 }
          12%,50% { opacity: .15 }
        }
        @keyframes cab-bolt-v {
          0%,6%,14%,42%,50%,100% { opacity: 0; filter: brightness(1) }
          8%,44% { opacity: 1; filter: brightness(2.2) drop-shadow(0 0 12px #60a5fa) }
          11%,47% { opacity: .25 }
        }
        @keyframes cab-bolt-h {
          0%,7%,15%,43%,52%,100% { opacity: 0; filter: brightness(1) }
          9%,45% { opacity: 1; filter: brightness(2.2) drop-shadow(0 0 12px #60a5fa) }
          12%,48% { opacity: .25 }
        }
      `}</style>
    </div>
  );
}

function BoltEdge({ position = 'top' }) {
  const isVertical = position === 'left' || position === 'right';
  const anim = isVertical ? 'cab-bolt-h' : 'cab-bolt-v';
  const posClass =
    position === 'top' ? 'top-0 left-0 right-0 h-24'
    : position === 'bottom' ? 'bottom-0 left-0 right-0 h-24'
    : position === 'left' ? 'left-0 top-0 bottom-0 w-20'
    : 'right-0 top-0 bottom-0 w-20';

  const bolts = Array.from({ length: isVertical ? 4 : 5 });
  return (
    <div className={`absolute ${posClass} pointer-events-none`}>
      {bolts.map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 100 200"
          preserveAspectRatio="none"
          className="absolute"
          style={{
            [isVertical ? 'top' : 'left']: `${(i + 0.5) * (100 / bolts.length)}%`,
            [isVertical ? 'left' : 'top']: 0,
            width: isVertical ? '100%' : '14px',
            height: isVertical ? '90px' : '100%',
            transform: `${position === 'bottom' || position === 'right' ? 'rotate(180deg)' : ''} ${position === 'left' ? 'scaleX(-1)' : ''}`,
            animation: `${anim} 1.6s ease-in-out ${i * 0.18}s infinite`,
            filter: 'blur(0.5px)',
          }}
        >
          <polyline
            points="50,0 35,60 60,80 30,140 55,160 40,200"
            fill="none"
            stroke="#bfdbfe"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px #60a5fa)' }}
          />
        </svg>
      ))}
    </div>
  );
}