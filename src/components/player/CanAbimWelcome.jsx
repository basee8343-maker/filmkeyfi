import { useEffect, useState } from 'react';
import { Image } from '@/components/ui/image';
import LightningStrike from '@/components/player/LightningStrike';

const SPLASH_IMAGE = 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/281563236_generated_image.png';

export default function CanAbimWelcome({ onDone }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => { const timer = setTimeout(() => dismiss(), 5500); return () => clearTimeout(timer); }, []);
  const dismiss = () => { setExiting(true); setTimeout(() => onDone?.(), 600); };

  return (
    <div className={`pointer-events-none fixed inset-0 z-[90] flex items-end justify-center pb-[20vh] ${exiting ? 'opacity-0 transition-opacity duration-500' : 'animate-[can-abim-fade_.35s_ease-out]'}`}>
      <div className="absolute inset-0 bg-blue-500/5 animate-[can-abim-flash_1.35s_infinite]" />
      <LightningStrike side="left" />
      <LightningStrike side="right" />
      <LightningStrike side="top" />
      <LightningStrike side="bottom" />
      <button type="button" onClick={dismiss} className="pointer-events-auto relative z-10 border-0 bg-transparent p-0" aria-label="Karşılamayı kapat">
        <div className="absolute inset-2 rounded-full bg-blue-500/25 blur-3xl animate-pulse" />
        <Image src={SPLASH_IMAGE} alt="Can Abim - Kral Turgay" originWidth={1024} originHeight={1536} className="relative w-[76vw] max-w-[340px] animate-[can-abim-pop_.8s_cubic-bezier(.34,1.56,.64,1)]" fittingType="fit" draggable={false} />
      </button>
      <style>{`
        @keyframes can-abim-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes can-abim-pop { from { opacity: 0; transform: scale(.45) translateY(28px) } 70% { transform: scale(1.06) } to { opacity: 1; transform: scale(1) } }
        @keyframes can-abim-flash { 0%,8%,14%,45%,51%,100% { opacity: 0 } 10%,48% { opacity: .8 } 12%,50% { opacity: .2 } }
        @keyframes can-abim-strike { 0%,7%,15%,44%,52%,100% { opacity: 0; filter: brightness(1) } 9%,46% { opacity: 1; filter: brightness(2.4) drop-shadow(0 0 14px #60a5fa) } 12%,49% { opacity: .25 } }
      `}</style>
    </div>
  );
}