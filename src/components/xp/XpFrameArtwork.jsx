import XpFrameDecorations from '@/components/xp/XpFrameDecorations';

export default function XpFrameArtwork({ type = 'starter', colors, glow, animated }) {
  const uid = `xp-${type}`;
  return (
    <svg viewBox="0 0 100 100" role="presentation" aria-hidden="true" className={`w-full h-full overflow-visible ${animated ? 'xp-frame-asset' : ''}`}>
      <defs>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={colors[0]} /><stop offset=".48" stopColor={colors[1]} /><stop offset="1" stopColor={colors[0]} />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" result="blur" /><feFlood floodColor={glow} floodOpacity=".85" /><feComposite in2="blur" operator="in" /><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g fill="none" stroke={`url(#${uid}-metal)`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${uid}-glow)`}>
        <circle cx="50" cy="50" r="35" />
      </g>
      <g fill={`url(#${uid}-metal)`} stroke={colors[1]} strokeWidth="1.2" strokeLinejoin="round" filter={`url(#${uid}-glow)`}>
        <XpFrameDecorations type={type} />
      </g>
    </svg>
  );
}