export default function LightningStrike({ side, delay = 0 }) {
  const vertical = side === 'left' || side === 'right';
  const position = {
    left: 'left-[3%] top-1/2 -translate-y-1/2',
    right: 'right-[3%] top-1/2 -translate-y-1/2',
    top: 'top-[6%] left-1/2 -translate-x-1/2 rotate-90',
    bottom: 'bottom-[8%] left-1/2 -translate-x-1/2 rotate-90',
  }[side];

  return (
    <svg viewBox="0 0 90 320" className={`absolute ${position} ${vertical ? 'h-[46vh] w-24' : 'h-24 w-[46vh]'} overflow-visible`} style={{ animation: `can-abim-strike 1.35s ${delay}s infinite` }} aria-hidden="true">
      <polyline points="48,0 24,62 55,82 20,145 51,160 18,230 43,242 8,320" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="48,0 24,62 55,82 20,145 51,160 18,230 43,242 8,320" fill="none" stroke="#60a5fa" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" filter="blur(7px)" />
      <polyline points="35,104 70,137 48,183" fill="none" stroke="#bfdbfe" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}