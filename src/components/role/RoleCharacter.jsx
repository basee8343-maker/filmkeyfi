// Animated SVG characters for role celebrations and entrances.
// Each character is a multi-layer SVG with CSS-driven animations (no static images).

function FounderCharacter({ color = '#ff4500' }) {
  return (
    <svg viewBox="0 0 240 340" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="founderAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="60%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="founderCrown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffdd00" />
          <stop offset="50%" stopColor="#ff8800" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <linearGradient id="founderFlame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffdd00" />
          <stop offset="40%" stopColor="#ff8800" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <linearGradient id="founderBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a0a00" />
          <stop offset="100%" stopColor="#1a0500" />
        </linearGradient>
        <filter id="founderGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Aura */}
      <circle cx="120" cy="170" r="130" fill="url(#founderAura)" className="char-aura-pulse" />

      {/* Side flames */}
      <g className="char-side-flames">
        <path d="M 50 220 Q 42 200 48 175 Q 52 195 55 210 Q 58 195 55 175 Q 62 200 50 220 Z" fill="url(#founderFlame)" className="char-flame-flicker" />
        <path d="M 190 220 Q 182 200 188 175 Q 192 195 195 210 Q 198 195 195 175 Q 202 200 190 220 Z" fill="url(#founderFlame)" className="char-flame-flicker" style={{ animationDelay: '0.4s' }} />
        <path d="M 35 250 Q 30 230 34 210 Q 38 225 40 240 Q 42 225 40 210 Q 45 230 35 250 Z" fill="url(#founderFlame)" className="char-flame-flicker" style={{ animationDelay: '0.2s' }} />
        <path d="M 205 250 Q 200 230 204 210 Q 208 225 210 240 Q 212 225 210 210 Q 215 230 205 250 Z" fill="url(#founderFlame)" className="char-flame-flicker" style={{ animationDelay: '0.6s' }} />
      </g>

      {/* Body silhouette */}
      <g className="char-body-breathe">
        <path d="M 120 95 C 98 95 82 110 82 132 L 82 155 L 55 175 L 42 320 L 198 320 L 185 175 L 158 155 L 158 132 C 158 110 142 95 120 95 Z" fill="url(#founderBody)" stroke={color} strokeWidth="2.5" filter="url(#founderGlow)" />

        {/* Shoulders detail */}
        <path d="M 82 155 L 55 175 L 50 195 L 82 180 Z" fill={color} opacity="0.3" />
        <path d="M 158 155 L 185 175 L 190 195 L 158 180 Z" fill={color} opacity="0.3" />
      </g>

      {/* Crown */}
      <g className="char-crown-glow">
        <path d="M 82 98 L 92 65 L 105 88 L 120 52 L 135 88 L 148 65 L 158 98 L 150 108 L 90 108 Z" fill="url(#founderCrown)" stroke="#ffaa00" strokeWidth="1.5" />
        <circle cx="120" cy="52" r="5" fill="#ffdd00" className="char-eye-glow" />
        <circle cx="92" cy="65" r="3.5" fill="#ffdd00" className="char-eye-glow" style={{ animationDelay: '0.3s' }} />
        <circle cx="148" cy="65" r="3.5" fill="#ffdd00" className="char-eye-glow" style={{ animationDelay: '0.6s' }} />
      </g>

      {/* Crown flame tips */}
      <path d="M 92 65 Q 88 50 92 42 Q 96 50 92 65 Z" fill="url(#founderFlame)" className="char-flame-flicker" />
      <path d="M 120 52 Q 116 34 120 24 Q 124 34 120 52 Z" fill="url(#founderFlame)" className="char-flame-flicker" style={{ animationDelay: '0.3s' }} />
      <path d="M 148 65 Q 144 50 148 42 Q 152 50 148 65 Z" fill="url(#founderFlame)" className="char-flame-flicker" style={{ animationDelay: '0.6s' }} />

      {/* Eyes */}
      <circle cx="103" cy="128" r="5" fill="#ffcc00" className="char-eye-glow" />
      <circle cx="137" cy="128" r="5" fill="#ffcc00" className="char-eye-glow" />

      {/* Chest flame emblem */}
      <g className="char-chest-flame">
        <path d="M 120 200 Q 108 180 114 160 Q 120 150 120 138 Q 120 150 126 160 Q 132 180 120 200 Z" fill="url(#founderFlame)" />
        <path d="M 120 195 Q 114 185 117 172 Q 120 167 120 160 Q 120 167 123 172 Q 126 185 120 195 Z" fill="#ffdd00" />
      </g>

      {/* Rising flame particles */}
      <g className="char-particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <circle key={i} cx={60 + i * 22} cy={280} r="3" fill={color} className="char-flame-particle" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </g>
    </svg>
  );
}

function QueenCharacter({ color = '#ec4899' }) {
  return (
    <svg viewBox="0 0 240 340" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="queenAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="60%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="queenCrown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff0fa" />
          <stop offset="50%" stopColor="#f9a8d4" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <linearGradient id="queenBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a0a2a" />
          <stop offset="100%" stopColor="#1a0515" />
        </linearGradient>
        <linearGradient id="queenDress" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
        <filter id="queenGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Aura */}
      <circle cx="120" cy="170" r="130" fill="url(#queenAura)" className="char-aura-pulse" />

      {/* Floating hearts */}
      <g className="char-particles">
        {Array.from({ length: 7 }).map((_, i) => {
          const x = 30 + i * 28 + (i % 2) * 8;
          return (
            <path key={i} d="M 0 8 C -6 3 -9 -3 -4 -6 C -1 -8 0 -5 0 -3 C 0 -5 1 -8 4 -6 C 9 -3 6 3 0 8 Z" fill={color} className="char-heart-float" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${x}px 250px` }} transform={`translate(${x}, 250)`} />
          );
        })}
      </g>

      {/* Body with dress */}
      <g className="char-queen-float">
        {/* Dress (flowing) */}
        <path d="M 120 100 C 100 100 85 115 85 135 L 85 158 L 70 175 L 45 320 L 195 320 L 170 175 L 155 158 L 155 135 C 155 115 140 100 120 100 Z" fill="url(#queenBody)" stroke={color} strokeWidth="2.5" filter="url(#queenGlow)" />
        <path d="M 85 158 L 70 175 L 55 280 L 85 220 Z" fill="url(#queenDress)" className="char-dress-sway" />
        <path d="M 155 158 L 170 175 L 185 280 L 155 220 Z" fill="url(#queenDress)" className="char-dress-sway" style={{ animationDelay: '0.5s' }} />

        {/* Hair sides */}
        <path d="M 82 110 Q 68 140 72 180 Q 78 150 85 135 Z" fill="#1a0515" className="char-hair-sway" />
        <path d="M 158 110 Q 172 140 168 180 Q 162 150 155 135 Z" fill="#1a0515" className="char-hair-sway" style={{ animationDelay: '0.4s' }} />

        {/* Head */}
        <ellipse cx="120" cy="125" rx="28" ry="32" fill="url(#queenBody)" stroke={color} strokeWidth="2" />

        {/* Crown */}
        <g className="char-crown-glow">
          <path d="M 92 100 L 100 72 L 110 92 L 120 60 L 130 92 L 140 72 L 148 100 L 142 110 L 98 110 Z" fill="url(#queenCrown)" stroke="#f9a8d4" strokeWidth="1.5" />
          <circle cx="120" cy="60" r="5" fill="#fff0fa" className="char-eye-glow" />
          <circle cx="100" cy="72" r="3.5" fill="#fff0fa" className="char-eye-glow" style={{ animationDelay: '0.3s' }} />
          <circle cx="140" cy="72" r="3.5" fill="#fff0fa" className="char-eye-glow" style={{ animationDelay: '0.6s' }} />
          {/* Crown sparkles */}
          <circle cx="110" cy="92" r="2" fill="#fff0fa" className="char-sparkle" />
          <circle cx="130" cy="92" r="2" fill="#fff0fa" className="char-sparkle" style={{ animationDelay: '0.5s' }} />
        </g>

        {/* Eyes */}
        <ellipse cx="110" cy="128" rx="4" ry="5" fill="#f9a8d4" className="char-eye-glow" />
        <ellipse cx="130" cy="128" rx="4" ry="5" fill="#f9a8d4" className="char-eye-glow" />

        {/* Lips */}
        <path d="M 115 145 Q 120 149 125 145 Q 120 147 115 145 Z" fill={color} />

        {/* Dress sparkles */}
        <circle cx="100" cy="250" r="2.5" fill="#fff0fa" className="char-sparkle" />
        <circle cx="140" cy="270" r="2.5" fill="#fff0fa" className="char-sparkle" style={{ animationDelay: '0.4s' }} />
        <circle cx="120" cy="290" r="2.5" fill="#fff0fa" className="char-sparkle" style={{ animationDelay: '0.8s' }} />
        <circle cx="80" cy="295" r="2" fill="#fff0fa" className="char-sparkle" style={{ animationDelay: '0.2s' }} />
        <circle cx="160" cy="295" r="2" fill="#fff0fa" className="char-sparkle" style={{ animationDelay: '0.6s' }} />
      </g>
    </svg>
  );
}

function HelperCharacter({ color = '#3b82f6' }) {
  return (
    <svg viewBox="0 0 240 340" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="helperAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="60%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="helperCrown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="50%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <linearGradient id="helperBolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="50%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <linearGradient id="helperBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1a3a" />
          <stop offset="100%" stopColor="#050a1a" />
        </linearGradient>
        <filter id="helperGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Aura */}
      <circle cx="120" cy="170" r="130" fill="url(#helperAura)" className="char-aura-pulse" />

      {/* Lightning bolts around */}
      <g className="char-particles">
        <path d="M 45 180 L 55 160 L 48 160 L 60 135 L 52 165 L 60 165 L 45 180 Z" fill="url(#helperBolt)" className="char-lightning-flash" />
        <path d="M 195 180 L 185 160 L 192 160 L 180 135 L 188 165 L 180 165 L 195 180 Z" fill="url(#helperBolt)" className="char-lightning-flash" style={{ animationDelay: '0.3s' }} />
        <path d="M 35 250 L 45 230 L 38 230 L 50 205 L 42 235 L 50 235 L 35 250 Z" fill="url(#helperBolt)" className="char-lightning-flash" style={{ animationDelay: '0.5s' }} />
        <path d="M 205 250 L 195 230 L 202 230 L 190 205 L 198 235 L 190 235 L 205 250 Z" fill="url(#helperBolt)" className="char-lightning-flash" style={{ animationDelay: '0.7s' }} />
      </g>

      {/* Body */}
      <g className="char-body-breathe">
        <path d="M 120 100 C 100 100 85 115 85 135 L 85 158 L 62 178 L 48 320 L 192 320 L 178 178 L 155 158 L 155 135 C 155 115 140 100 120 100 Z" fill="url(#helperBody)" stroke={color} strokeWidth="2.5" filter="url(#helperGlow)" />
        {/* Shoulder accents */}
        <path d="M 85 158 L 62 178 L 58 200 L 85 185 Z" fill={color} opacity="0.25" />
        <path d="M 155 158 L 178 178 L 182 200 L 155 185 Z" fill={color} opacity="0.25" />
      </g>

      {/* Head */}
      <ellipse cx="120" cy="125" rx="26" ry="30" fill="url(#helperBody)" stroke={color} strokeWidth="2" />

      {/* Headband with lightning */}
      <g className="char-crown-glow">
        <rect x="94" y="104" width="52" height="10" rx="2" fill="url(#helperCrown)" />
        <path d="M 116 104 L 112 90 L 122 96 L 118 80 L 128 100 L 120 94 L 124 104 Z" fill="url(#helperBolt)" className="char-lightning-flash" />
      </g>

      {/* Eyes */}
      <circle cx="110" cy="128" r="4.5" fill="#60a5fa" className="char-eye-glow" />
      <circle cx="130" cy="128" r="4.5" fill="#60a5fa" className="char-eye-glow" />

      {/* Chest lightning emblem */}
      <g className="char-chest-bolt">
        <path d="M 115 200 L 108 175 L 120 180 L 112 155 L 128 190 L 116 185 L 125 200 Z" fill="url(#helperBolt)" />
      </g>

      {/* Electric particles */}
      <g className="char-particles">
        {Array.from({ length: 6 }).map((_, i) => (
          <circle key={i} cx={70 + i * 25} cy={270} r="2.5" fill={color} className="char-electric-particle" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
      </g>
    </svg>
  );
}

function CanAblamCharacter({ color = '#ff1744' }) {
  return (
    <svg viewBox="0 0 240 340" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="ablamAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="60%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ablamCrown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#cccccc" />
        </linearGradient>
        <linearGradient id="ablamBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a0010" />
          <stop offset="100%" stopColor="#1a0008" />
        </linearGradient>
        <linearGradient id="ablamDress" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
        <filter id="ablamGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="diamondShine" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Aura */}
      <circle cx="120" cy="170" r="130" fill="url(#ablamAura)" className="char-aura-pulse" />

      {/* Floating diamonds */}
      <g className="char-particles">
        {Array.from({ length: 7 }).map((_, i) => {
          const x = 30 + i * 28 + (i % 2) * 8;
          return (
            <g key={i} transform={`translate(${x}, 250)`} className="char-heart-float" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${x}px 250px` }}>
              <path d="M 0 -6 L 5 0 L 0 6 L -5 0 Z" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 3px #fff) drop-shadow(0 0 2px #ff1744)' }} />
            </g>
          );
        })}
      </g>

      {/* Body with dress */}
      <g className="char-queen-float">
        {/* Dress */}
        <path d="M 120 100 C 100 100 85 115 85 135 L 85 158 L 70 175 L 45 320 L 195 320 L 170 175 L 155 158 L 155 135 C 155 115 140 100 120 100 Z" fill="url(#ablamBody)" stroke={color} strokeWidth="2.5" filter="url(#ablamGlow)" />
        <path d="M 85 158 L 70 175 L 55 280 L 85 220 Z" fill="url(#ablamDress)" className="char-dress-sway" />
        <path d="M 155 158 L 170 175 L 185 280 L 155 220 Z" fill="url(#ablamDress)" className="char-dress-sway" style={{ animationDelay: '0.5s' }} />

        {/* Hair */}
        <path d="M 82 110 Q 68 140 72 180 Q 78 150 85 135 Z" fill="#1a0008" className="char-hair-sway" />
        <path d="M 158 110 Q 172 140 168 180 Q 162 150 155 135 Z" fill="#1a0008" className="char-hair-sway" style={{ animationDelay: '0.4s' }} />

        {/* Head */}
        <ellipse cx="120" cy="125" rx="28" ry="32" fill="url(#ablamBody)" stroke={color} strokeWidth="2" />

        {/* Diamond Crown — white shiny diamonds */}
        <g className="diamond-shimmer" style={{ animation: 'diamond-shimmer 2s ease-in-out infinite' }}>
          <path d="M 88 100 L 96 70 L 108 90 L 120 56 L 132 90 L 144 70 L 152 100 L 146 110 L 94 110 Z" fill="url(#ablamCrown)" stroke="#ffffff" strokeWidth="1.5" filter="url(#diamondShine)" />
          {/* Diamond gems on crown */}
          <g className="diamond-crown-sparkle" style={{ animation: 'diamond-crown-sparkle 1.5s ease-in-out infinite' }}>
            <path d="M 120 56 L 125 62 L 120 68 L 115 62 Z" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 4px #fff)' }} />
          </g>
          <g className="diamond-crown-sparkle" style={{ animation: 'diamond-crown-sparkle 1.5s ease-in-out 0.3s infinite' }}>
            <path d="M 96 70 L 100 75 L 96 80 L 92 75 Z" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 3px #fff)' }} />
          </g>
          <g className="diamond-crown-sparkle" style={{ animation: 'diamond-crown-sparkle 1.5s ease-in-out 0.6s infinite' }}>
            <path d="M 144 70 L 148 75 L 144 80 L 140 75 Z" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 3px #fff)' }} />
          </g>
          {/* Crown band diamonds */}
          <circle cx="100" cy="105" r="2.5" fill="#ffffff" className="char-sparkle" style={{ filter: 'drop-shadow(0 0 3px #fff)' }} />
          <circle cx="120" cy="105" r="2.5" fill="#ffffff" className="char-sparkle" style={{ animationDelay: '0.3s', filter: 'drop-shadow(0 0 3px #fff)' }} />
          <circle cx="140" cy="105" r="2.5" fill="#ffffff" className="char-sparkle" style={{ animationDelay: '0.6s', filter: 'drop-shadow(0 0 3px #fff)' }} />
        </g>

        {/* Eyes */}
        <ellipse cx="110" cy="128" rx="4" ry="5" fill={color} className="char-eye-glow" />
        <ellipse cx="130" cy="128" rx="4" ry="5" fill={color} className="char-eye-glow" />

        {/* Lips */}
        <path d="M 115 145 Q 120 149 125 145 Q 120 147 115 145 Z" fill={color} />

        {/* Dress diamond sparkles */}
        <path d="M 100 250 L 103 253 L 100 256 L 97 253 Z" fill="#ffffff" className="char-sparkle" style={{ filter: 'drop-shadow(0 0 2px #fff)' }} />
        <path d="M 140 270 L 143 273 L 140 276 L 137 273 Z" fill="#ffffff" className="char-sparkle" style={{ animationDelay: '0.4s', filter: 'drop-shadow(0 0 2px #fff)' }} />
        <path d="M 120 290 L 123 293 L 120 296 L 117 293 Z" fill="#ffffff" className="char-sparkle" style={{ animationDelay: '0.8s', filter: 'drop-shadow(0 0 2px #fff)' }} />
        <path d="M 80 295 L 82 297 L 80 299 L 78 297 Z" fill="#ffffff" className="char-sparkle" style={{ animationDelay: '0.2s', filter: 'drop-shadow(0 0 2px #fff)' }} />
        <path d="M 160 295 L 162 297 L 160 299 L 158 297 Z" fill="#ffffff" className="char-sparkle" style={{ animationDelay: '0.6s', filter: 'drop-shadow(0 0 2px #fff)' }} />
      </g>
    </svg>
  );
}

function CanAbimCharacter({ color = '#00e5ff' }) {
  return (
    <svg viewBox="0 0 320 340" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="abimAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="60%" stopColor={color} stopOpacity="0.1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="abimCarBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="50%" stopColor="#16213e" />
          <stop offset="100%" stopColor="#0a0a1a" />
        </linearGradient>
        <linearGradient id="abimCarAccent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#00b8d4" />
        </linearGradient>
        <linearGradient id="abimWindow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0a0a1a" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="abimBolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor="#00b8d4" />
        </linearGradient>
        <filter id="abimGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Aura */}
      <circle cx="160" cy="170" r="140" fill="url(#abimAura)" className="char-aura-pulse" />

      {/* Lightning bolts striking from top */}
      <g style={{ animation: 'car-lightning-strike 2.5s ease-in-out infinite' }}>
        <path d="M 80 20 L 95 50 L 85 50 L 105 80 L 90 55 L 100 55 L 80 20 Z" fill="url(#abimBolt)" style={{ filter: 'drop-shadow(0 0 8px #fff) drop-shadow(0 0 4px #00e5ff)' }} />
      </g>
      <g style={{ animation: 'car-lightning-strike 2.5s ease-in-out 0.8s infinite' }}>
        <path d="M 240 20 L 255 50 L 245 50 L 265 80 L 250 55 L 260 55 L 240 20 Z" fill="url(#abimBolt)" style={{ filter: 'drop-shadow(0 0 8px #fff) drop-shadow(0 0 4px #00e5ff)' }} />
      </g>
      <g style={{ animation: 'car-lightning-strike 2.5s ease-in-out 1.5s infinite' }}>
        <path d="M 160 10 L 170 35 L 163 35 L 178 60 L 168 38 L 175 38 L 160 10 Z" fill="url(#abimBolt)" style={{ filter: 'drop-shadow(0 0 8px #fff) drop-shadow(0 0 4px #00e5ff)' }} />
      </g>

      {/* Speed lines behind car */}
      <g>
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="20" y1={140 + i * 20} x2="80" y2={140 + i * 20} stroke={color} strokeWidth="2" opacity="0.6" style={{ animation: `car-speed-lines 0.8s linear ${i * 0.15}s infinite` }} />
        ))}
      </g>

      {/* Car — side view, driving */}
      <g style={{ animation: 'car-bounce 0.3s ease-in-out infinite' }}>
        {/* Car shadow */}
        <ellipse cx="160" cy="265" rx="90" ry="8" fill="#000" opacity="0.4" />

        {/* Car body */}
        <g filter="url(#abimGlow)">
          {/* Lower body */}
          <path d="M 70 240 L 70 220 Q 70 210 80 205 L 100 200 Q 110 195 120 185 L 200 185 Q 210 195 220 200 L 240 205 Q 250 210 250 220 L 250 240 L 240 250 L 80 250 Z" fill="url(#abimCarBody)" stroke={color} strokeWidth="2" />
          {/* Roof */}
          <path d="M 120 185 Q 130 160 145 158 L 175 158 Q 190 160 200 185 Z" fill="url(#abimCarBody)" stroke={color} strokeWidth="2" />
          {/* Windows */}
          <path d="M 128 183 Q 135 165 148 163 L 172 163 Q 185 165 192 183 Z" fill="url(#abimWindow)" />
          {/* Window divider */}
          <line x1="160" y1="163" x2="160" y2="183" stroke={color} strokeWidth="1.5" opacity="0.5" />
          {/* Accent stripe */}
          <rect x="75" y="225" width="170" height="4" fill="url(#abimCarAccent)" rx="2" />
          {/* Headlight */}
          <circle cx="245" cy="220" r="5" fill={color} className="char-eye-glow" style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
          {/* Taillight */}
          <circle cx="75" cy="220" r="4" fill="#ff1744" style={{ filter: 'drop-shadow(0 0 6px #ff1744)' }} />
        </g>

        {/* Wheels */}
        <g>
          <circle cx="110" cy="250" r="20" fill="#0a0a1a" stroke={color} strokeWidth="2.5" />
          <circle cx="110" cy="250" r="10" fill="#1a1a2e" stroke={color} strokeWidth="1.5" />
          <circle cx="110" cy="250" r="3" fill={color} />
          {/* Spokes */}
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return <line key={angle} x1="110" y1="250" x2={110 + Math.cos(rad) * 9} y2={250 + Math.sin(rad) * 9} stroke={color} strokeWidth="1" opacity="0.6" />;
          })}
        </g>
        <g>
          <circle cx="210" cy="250" r="20" fill="#0a0a1a" stroke={color} strokeWidth="2.5" />
          <circle cx="210" cy="250" r="10" fill="#1a1a2e" stroke={color} strokeWidth="1.5" />
          <circle cx="210" cy="250" r="3" fill={color} />
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return <line key={angle} x1="210" y1="250" x2={210 + Math.cos(rad) * 9} y2={250 + Math.sin(rad) * 9} stroke={color} strokeWidth="1" opacity="0.6" />;
          })}
        </g>
      </g>

      {/* Exhaust smoke */}
      <g>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx="65" cy="235" r="4" fill={color} opacity="0.4" style={{ animation: `car-exhaust 1s ease-out ${i * 0.3}s infinite` }} />
        ))}
      </g>

      {/* Ground line */}
      <line x1="20" y1="275" x2="300" y2="275" stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="10 6" />
    </svg>
  );
}

function NargilecilerCharacter({ color = '#4caf50' }) {
  return (
    <svg viewBox="0 0 320 340" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="nargileAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="60%" stopColor={color} stopOpacity="0.1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nargileBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2a1a" />
          <stop offset="100%" stopColor="#0a1a0a" />
        </linearGradient>
        <linearGradient id="nargileBottle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4caf50" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#2e7d32" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="nargileMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c0c0c0" />
          <stop offset="50%" stopColor="#808080" />
          <stop offset="100%" stopColor="#606060" />
        </linearGradient>
        <filter id="nargileGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Aura */}
      <circle cx="160" cy="170" r="140" fill="url(#nargileAura)" className="char-aura-pulse" />

      {/* Smoke clouds rising */}
      <g>
        {Array.from({ length: 6 }).map((_, i) => (
          <circle key={i} cx={100 + i * 24} cy="140" r="8" fill="#ffffff" opacity="0.15" style={{ animation: `nargile-smoke-rise ${2.5 + i * 0.3}s ease-out ${i * 0.4}s infinite` }} />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <circle key={'b' + i} cx={120 + i * 30} cy="140" r="6" fill="#c8e6c9" opacity="0.12" style={{ animation: `nargile-smoke-rise-2 ${3 + i * 0.4}s ease-out ${i * 0.5}s infinite` }} />
        ))}
      </g>

      {/* Ground */}
      <ellipse cx="160" cy="310" rx="120" ry="10" fill="#000" opacity="0.3" />

      {/* === Person 1: Man (left) === */}
      <g className="nargile-person-breathe" style={{ animation: 'nargile-person-breathe 3s ease-in-out infinite' }}>
        {/* Body */}
        <path d="M 55 310 L 55 250 Q 55 240 65 235 L 85 235 Q 95 240 95 250 L 95 310 Z" fill="url(#nargileBody)" stroke={color} strokeWidth="1.5" filter="url(#nargileGlow)" />
        {/* Head */}
        <circle cx="75" cy="225" r="14" fill="url(#nargileBody)" stroke={color} strokeWidth="1.5" />
        {/* Hair (short, man) */}
        <path d="M 62 220 Q 62 210 75 208 Q 88 210 88 220 L 88 215 Q 75 212 62 215 Z" fill="#0a1a0a" />
        {/* Eyes */}
        <circle cx="71" cy="225" r="2" fill={color} className="char-eye-glow" />
        <circle cx="79" cy="225" r="2" fill={color} className="char-eye-glow" />
        {/* Arm holding hose */}
        <path d="M 95 255 Q 110 260 125 265" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      {/* === Person 2: Woman (center) === */}
      <g className="nargile-person-breathe" style={{ animation: 'nargile-person-breathe 3s ease-in-out 0.5s infinite' }}>
        {/* Body */}
        <path d="M 140 310 L 140 245 Q 140 235 152 230 L 168 230 Q 180 235 180 245 L 180 310 Z" fill="url(#nargileBody)" stroke={color} strokeWidth="1.5" filter="url(#nargileGlow)" />
        {/* Dress shape */}
        <path d="M 145 260 L 135 310 L 185 310 L 175 260 Z" fill={color} opacity="0.15" />
        {/* Head */}
        <circle cx="160" cy="218" r="15" fill="url(#nargileBody)" stroke={color} strokeWidth="1.5" />
        {/* Long hair (woman) */}
        <path d="M 146 215 Q 144 200 160 198 Q 176 200 174 215 L 176 240 Q 170 245 165 243 L 165 225 Q 160 222 155 225 L 155 243 Q 150 245 144 240 Z" fill="#0a1a0a" />
        {/* Eyes with eyelashes */}
        <ellipse cx="155" cy="218" rx="2.5" ry="2" fill={color} className="char-eye-glow" />
        <ellipse cx="165" cy="218" rx="2.5" ry="2" fill={color} className="char-eye-glow" />
        {/* Lips */}
        <path d="M 157 226 Q 160 228 163 226 Q 160 227 157 226 Z" fill="#ec4899" opacity="0.6" />
        {/* Arm holding hose */}
        <path d="M 180 255 Q 195 255 205 260" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      {/* === Person 3: Man (right) === */}
      <g className="nargile-person-breathe" style={{ animation: 'nargile-person-breathe 3s ease-in-out 1s infinite' }}>
        {/* Body */}
        <path d="M 225 310 L 225 250 Q 225 240 235 235 L 255 235 Q 265 240 265 250 L 265 310 Z" fill="url(#nargileBody)" stroke={color} strokeWidth="1.5" filter="url(#nargileGlow)" />
        {/* Head */}
        <circle cx="245" cy="225" r="14" fill="url(#nargileBody)" stroke={color} strokeWidth="1.5" />
        {/* Hair (short, man) */}
        <path d="M 232 220 Q 232 210 245 208 Q 258 210 258 220 L 258 215 Q 245 212 232 215 Z" fill="#0a1a0a" />
        {/* Eyes */}
        <circle cx="241" cy="225" r="2" fill={color} className="char-eye-glow" />
        <circle cx="249" cy="225" r="2" fill={color} className="char-eye-glow" />
        {/* Arm holding hose */}
        <path d="M 225 255 Q 215 260 205 265" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      {/* === Nargile (center, on table) === */}
      <g style={{ animation: 'nargile-bubble 2s ease-in-out infinite' }}>
        {/* Table */}
        <rect x="120" y="280" width="80" height="6" rx="2" fill="#3a2a1a" stroke={color} strokeWidth="1" opacity="0.7" />
        {/* Bottle base */}
        <path d="M 145 280 L 145 255 Q 145 250 150 248 L 170 248 Q 175 250 175 255 L 175 280 Z" fill="url(#nargileBottle)" stroke={color} strokeWidth="1.5" filter="url(#nargileGlow)" />
        {/* Water bubbles */}
        <circle cx="155" cy="265" r="3" fill="#fff" opacity="0.3" />
        <circle cx="165" cy="270" r="2" fill="#fff" opacity="0.2" />
        {/* Stem */}
        <rect x="157" y="225" width="6" height="25" fill="url(#nargileMetal)" stroke={color} strokeWidth="0.5" />
        {/* Bowl (top) */}
        <path d="M 148 225 L 148 215 Q 148 210 160 210 Q 172 210 172 215 L 172 225 Z" fill="url(#nargileMetal)" stroke={color} strokeWidth="1" />
        {/* Bowl top */}
        <ellipse cx="160" cy="210" rx="12" ry="4" fill="#3a2a1a" stroke={color} strokeWidth="1" />
        {/* Coal */}
        <circle cx="160" cy="206" r="5" fill="#ff6b00" className="char-flame-flicker" style={{ filter: 'drop-shadow(0 0 4px #ff6b00)' }} />

        {/* Hoses — to each person */}
        <path d="M 172 220 Q 185 235 195 250 Q 205 260 125 265 Q 110 268 100 260" stroke={color} strokeWidth="2" fill="none" opacity="0.6" className="nargile-hose-sway" style={{ animation: 'nargile-hose-sway 4s ease-in-out infinite' }} />
        <path d="M 160 220 Q 160 235 160 245" stroke={color} strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M 148 220 Q 135 235 125 250 Q 220 260 230 260" stroke={color} strokeWidth="2" fill="none" opacity="0.6" className="nargile-hose-sway" style={{ animation: 'nargile-hose-sway 4s ease-in-out 1s infinite' }} />
      </g>
    </svg>
  );
}

function GenericCharacter({ color = '#8b5cf6', emoji = '✨' }) {
  return (
    <svg viewBox="0 0 240 340" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="genericAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="170" r="120" fill="url(#genericAura)" className="char-aura-pulse" />
      <g className="char-body-breathe">
        <text x="120" y="200" textAnchor="middle" fontSize="100" fill={color} style={{ filter: `drop-shadow(0 0 20px ${color})` }}>
          {emoji}
        </text>
      </g>
      <g className="char-particles">
        {Array.from({ length: 6 }).map((_, i) => (
          <circle key={i} cx={60 + i * 24} cy={270} r="3" fill={color} className="char-flame-particle" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </g>
    </svg>
  );
}

export default function RoleCharacter({ roleKey, color, emoji }) {
  switch (roleKey) {
    case 'founder':
      return <FounderCharacter color={color} />;
    case 'queen_admin':
      return <QueenCharacter color={color} />;
    case 'admin_helper':
      return <HelperCharacter color={color} />;
    case 'can_ablam':
      return <CanAblamCharacter color={color} />;
    case 'can_abim':
      return <CanAbimCharacter color={color} />;
    case 'nargileciler':
      return <NargilecilerCharacter color={color} />;
    case 'prince':
      return <GenericCharacter color={color || '#fbbf24'} emoji="🤴" />;
    case 'princess':
      return <GenericCharacter color={color || '#f472b6'} emoji="👸" />;
    case 'vip1':
      return <GenericCharacter color={color || '#06b6d4'} emoji="💎" />;
    case 'vip2':
      return <GenericCharacter color={color || '#a855f7'} emoji="💜" />;
    case 'vip3':
      return <GenericCharacter color={color || '#facc15'} emoji="🌟" />;
    default:
      return <GenericCharacter color={color || '#8b5cf6'} emoji={emoji || '✨'} />;
  }
}