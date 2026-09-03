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