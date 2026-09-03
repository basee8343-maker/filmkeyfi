// Profil çemberi giriş/çıkış efektleri için tema tanımları.
// Her rol için bir tema — renkler, dekorlar, rozet ve animasyonlar.

const STAR_PATH = "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4L2 9.4h7.6z";
const HEART_PATH = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
const DIAMOND_PATH = "M12 2L2 9l10 13L22 9z";

function svgDecor(i, dying, { viewBox, paths, fill, size, anim, filter, delayStep }) {
  return (
    <svg viewBox={viewBox} className={size} fill={fill} style={dying ? {
      animation: 'circle-die 0.8s ease-in forwards',
      animationDelay: `${i * 0.04}s`,
    } : {
      animation: `${anim} ${0.8 + (i % 3) * 0.15}s ease-in-out infinite`,
      animationDelay: `${(i * delayStep) % 0.6}s`,
      filter,
    }}>
      {paths.map((p, idx) => <path key={idx} d={p.d} fill={p.fill || fill} />)}
    </svg>
  );
}

function divDecor(i, dying, { className, style, anim, delayStep }) {
  return (
    <div className={className} style={dying ? {
      ...style,
      animation: 'circle-die 0.8s ease-in forwards',
      animationDelay: `${i * 0.04}s`,
    } : {
      ...style,
      animation: `${anim} ${0.8 + (i % 3) * 0.15}s ease-in-out infinite`,
      animationDelay: `${(i * delayStep) % 0.6}s`,
    }} />
  );
}

function emojiDecor(i, dying, { emoji, anim, delayStep }) {
  return (
    <div className="text-lg" style={dying ? {
      animation: 'circle-die 0.8s ease-in forwards',
      animationDelay: `${i * 0.04}s`,
    } : {
      animation: `${anim} ${1 + (i % 3) * 0.2}s ease-in-out infinite`,
      animationDelay: `${(i * delayStep) % 0.6}s`,
      filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))',
    }}>
      {emoji}
    </div>
  );
}

export const CIRCLE_THEMES = {
  // ADMİN / KURUCU — kral taçlı altın çember
  founder: {
    borderColor: 'border-yellow-500/70',
    glowColor: 'rgba(251,191,36,0.4)', glowColor2: 'rgba(252,211,77,0.2)',
    glowBg: 'rgba(251,191,36,0.15)', textGlow: 'rgba(251,191,36,0.9)', textGlow2: 'rgba(252,211,77,0.6)',
    fallbackBg: 'from-yellow-500/40 to-amber-600/40', fallbackText: 'text-yellow-200',
    badge: 'ADMİN / KURUCU', badgeGradient: 'from-yellow-500 to-amber-600', badgeGlow: 'rgba(251,191,36,0.8)', badgeSize: 'text-[7px]',
    topIcon: '👑', topIconGlow: 'rgba(251,191,36,0.9)',
    decorCount: 8, decorRadius: 55,
    renderDecoration: (i, dying) => svgDecor(i, dying, {
      viewBox: '0 0 24 24', paths: [{ d: STAR_PATH }], fill: '#fde047', size: 'w-3 h-3',
      anim: 'circle-decor-pulse', filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))', delayStep: 0.1,
    }),
  },

  // ADMİN YARDIMCISI — alevli çember
  admin_helper: {
    borderColor: 'border-orange-500/70',
    glowColor: 'rgba(255,69,0,0.4)', glowColor2: 'rgba(255,140,0,0.2)',
    glowBg: 'rgba(255,69,0,0.15)', textGlow: 'rgba(255,69,0,0.9)', textGlow2: 'rgba(255,140,0,0.6)',
    fallbackBg: 'from-orange-500/40 to-red-600/40', fallbackText: 'text-orange-200',
    badge: 'ADMİN YARDIMCISI', badgeGradient: 'from-orange-500 to-red-600', badgeGlow: 'rgba(255,69,0,0.8)', badgeSize: 'text-[8px]',
    topIcon: '🔥', topIconGlow: 'rgba(255,69,0,0.9)',
    decorCount: 12, decorRadius: 55,
    renderDecoration: (i, dying) => divDecor(i, dying, {
      className: 'admin-flame-tongue', style: {}, anim: 'circle-decor-flicker', delayStep: 0.08,
    }),
  },

  // ADMİN KRALİÇESİ — kırmızı kalp çember
  queen_admin: {
    borderColor: 'border-red-500/70',
    glowColor: 'rgba(255,23,68,0.4)', glowColor2: 'rgba(255,105,135,0.2)',
    glowBg: 'rgba(255,23,68,0.15)', textGlow: 'rgba(255,23,68,0.9)', textGlow2: 'rgba(255,105,135,0.6)',
    fallbackBg: 'from-red-500/40 to-pink-600/40', fallbackText: 'text-red-200',
    badge: 'ADMİN KRALİÇESİ', badgeGradient: 'from-red-500 to-pink-600', badgeGlow: 'rgba(255,23,68,0.8)', badgeSize: 'text-[8px]',
    topIcon: '❤️', topIconGlow: 'rgba(255,23,68,0.9)',
    decorCount: 8, decorRadius: 55,
    renderDecoration: (i, dying) => svgDecor(i, dying, {
      viewBox: '0 0 24 24', paths: [{ d: HEART_PATH }], fill: '#ff1744', size: 'w-3.5 h-3.5',
      anim: 'circle-decor-beat', filter: 'drop-shadow(0 0 4px rgba(255, 23, 68, 0.8))', delayStep: 0.1,
    }),
  },

  // CAN ABLAM — kırmızı nargile çember
  can_ablam: {
    borderColor: 'border-red-500/70',
    glowColor: 'rgba(255,23,68,0.4)', glowColor2: 'rgba(255,105,135,0.2)',
    glowBg: 'rgba(255,23,68,0.15)', textGlow: 'rgba(255,23,68,0.9)', textGlow2: 'rgba(255,105,135,0.6)',
    fallbackBg: 'from-red-500/40 to-rose-600/40', fallbackText: 'text-red-200',
    badge: 'CAN ABLAM', badgeGradient: 'from-red-500 to-rose-600', badgeGlow: 'rgba(255,23,68,0.8)', badgeSize: 'text-[8px]',
    topIcon: '🪔', topIconGlow: 'rgba(255,23,68,0.9)',
    decorCount: 8, decorRadius: 55,
    renderDecoration: (i, dying) => divDecor(i, dying, {
      className: 'rounded-full bg-red-200/40', style: { width: '12px', height: '12px', filter: 'blur(3px)' },
      anim: 'circle-decor-puff', delayStep: 0.15,
    }),
  },

  // CAN ABİM — aslan yeke çember
  can_abim: {
    borderColor: 'border-amber-500/70',
    glowColor: 'rgba(245,158,11,0.4)', glowColor2: 'rgba(251,191,36,0.2)',
    glowBg: 'rgba(245,158,11,0.15)', textGlow: 'rgba(245,158,11,0.9)', textGlow2: 'rgba(251,191,36,0.6)',
    fallbackBg: 'from-amber-500/40 to-orange-600/40', fallbackText: 'text-amber-200',
    badge: 'CAN ABİM', badgeGradient: 'from-amber-500 to-orange-600', badgeGlow: 'rgba(245,158,11,0.8)', badgeSize: 'text-[8px]',
    topIcon: '🦁', topIconGlow: 'rgba(245,158,11,0.9)',
    decorCount: 12, decorRadius: 52,
    renderDecoration: (i, dying) => svgDecor(i, dying, {
      viewBox: '0 0 12 16', paths: [{ d: 'M6 0L12 16H0z' }], fill: '#f59e0b', size: 'w-3 h-4',
      anim: 'circle-decor-mane', filter: 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.8))', delayStep: 0.08,
    }),
  },

  // NARGİLECİLER — yeşil nargile çember
  nargileciler: {
    borderColor: 'border-green-500/70',
    glowColor: 'rgba(76,175,80,0.4)', glowColor2: 'rgba(129,199,132,0.2)',
    glowBg: 'rgba(76,175,80,0.15)', textGlow: 'rgba(76,175,80,0.9)', textGlow2: 'rgba(129,199,132,0.6)',
    fallbackBg: 'from-green-500/40 to-emerald-600/40', fallbackText: 'text-green-200',
    badge: 'NARGİLECİLER', badgeGradient: 'from-green-500 to-emerald-600', badgeGlow: 'rgba(76,175,80,0.8)', badgeSize: 'text-[7px]',
    topIcon: '🪔', topIconGlow: 'rgba(76,175,80,0.9)',
    decorCount: 8, decorRadius: 55,
    renderDecoration: (i, dying) => divDecor(i, dying, {
      className: 'rounded-full bg-green-200/40', style: { width: '12px', height: '12px', filter: 'blur(3px)' },
      anim: 'circle-decor-puff', delayStep: 0.15,
    }),
  },

  // VIP 3 — yıldız çember
  vip3: {
    borderColor: 'border-yellow-400/70',
    glowColor: 'rgba(250,204,21,0.4)', glowColor2: 'rgba(254,240,138,0.2)',
    glowBg: 'rgba(250,204,21,0.15)', textGlow: 'rgba(250,204,21,0.9)', textGlow2: 'rgba(254,240,138,0.6)',
    fallbackBg: 'from-yellow-400/40 to-amber-500/40', fallbackText: 'text-yellow-100',
    badge: 'VIP 3', badgeGradient: 'from-yellow-400 to-amber-500', badgeGlow: 'rgba(250,204,21,0.8)', badgeSize: 'text-[8px]',
    topIcon: '🌟', topIconGlow: 'rgba(250,204,21,0.9)',
    decorCount: 8, decorRadius: 55,
    renderDecoration: (i, dying) => svgDecor(i, dying, {
      viewBox: '0 0 24 24', paths: [{ d: STAR_PATH }], fill: '#facc15', size: 'w-3 h-3',
      anim: 'circle-decor-pulse', filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))', delayStep: 0.1,
    }),
  },

  // VIP 2 — mor çiçek çember
  vip2: {
    borderColor: 'border-purple-500/70',
    glowColor: 'rgba(168,85,247,0.4)', glowColor2: 'rgba(216,180,254,0.2)',
    glowBg: 'rgba(168,85,247,0.15)', textGlow: 'rgba(168,85,247,0.9)', textGlow2: 'rgba(216,180,254,0.6)',
    fallbackBg: 'from-purple-500/40 to-violet-600/40', fallbackText: 'text-purple-200',
    badge: 'VIP 2', badgeGradient: 'from-purple-500 to-violet-600', badgeGlow: 'rgba(168,85,247,0.8)', badgeSize: 'text-[8px]',
    topIcon: '🌸', topIconGlow: 'rgba(168,85,247,0.9)',
    decorCount: 6, decorRadius: 55,
    renderDecoration: (i, dying) => (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={dying ? {
        animation: 'circle-die 0.8s ease-in forwards', animationDelay: `${i * 0.04}s`,
      } : {
        animation: `circle-decor-bloom ${1 + (i % 3) * 0.2}s ease-in-out infinite`, animationDelay: `${(i * 0.12) % 0.8}s`,
        filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.8))',
      }}>
        <circle cx="12" cy="5" r="3.5" fill="#a855f7" />
        <circle cx="19" cy="12" r="3.5" fill="#a855f7" />
        <circle cx="12" cy="19" r="3.5" fill="#a855f7" />
        <circle cx="5" cy="12" r="3.5" fill="#a855f7" />
        <circle cx="12" cy="12" r="2.5" fill="#fbbf24" />
      </svg>
    ),
  },

  // VIP 1 — elmas çember
  vip1: {
    borderColor: 'border-cyan-500/70',
    glowColor: 'rgba(6,182,212,0.4)', glowColor2: 'rgba(103,232,249,0.2)',
    glowBg: 'rgba(6,182,212,0.15)', textGlow: 'rgba(6,182,212,0.9)', textGlow2: 'rgba(103,232,249,0.6)',
    fallbackBg: 'from-cyan-500/40 to-blue-600/40', fallbackText: 'text-cyan-200',
    badge: 'VIP 1', badgeGradient: 'from-cyan-500 to-blue-600', badgeGlow: 'rgba(6,182,212,0.8)', badgeSize: 'text-[8px]',
    topIcon: '💎', topIconGlow: 'rgba(6,182,212,0.9)',
    decorCount: 8, decorRadius: 55,
    renderDecoration: (i, dying) => svgDecor(i, dying, {
      viewBox: '0 0 24 24', paths: [{ d: DIAMOND_PATH }], fill: '#06b6d4', size: 'w-3 h-3',
      anim: 'circle-decor-pulse', filter: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.8))', delayStep: 0.1,
    }),
  },

  // PRENS — mavi sevgililer kalp çember
  prince: {
    borderColor: 'border-blue-500/70',
    glowColor: 'rgba(59,130,246,0.4)', glowColor2: 'rgba(147,197,253,0.2)',
    glowBg: 'rgba(59,130,246,0.15)', textGlow: 'rgba(59,130,246,0.9)', textGlow2: 'rgba(147,197,253,0.6)',
    fallbackBg: 'from-blue-500/40 to-indigo-600/40', fallbackText: 'text-blue-200',
    badge: 'PRENS', badgeGradient: 'from-blue-500 to-indigo-600', badgeGlow: 'rgba(59,130,246,0.8)', badgeSize: 'text-[8px]',
    topIcon: '💙', topIconGlow: 'rgba(59,130,246,0.9)',
    decorCount: 8, decorRadius: 55,
    renderDecoration: (i, dying) => svgDecor(i, dying, {
      viewBox: '0 0 24 24', paths: [{ d: HEART_PATH }], fill: '#3b82f6', size: 'w-3.5 h-3.5',
      anim: 'circle-decor-beat', filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))', delayStep: 0.1,
    }),
  },

  // PRENSES — pembe kalp çember
  princess: {
    borderColor: 'border-pink-500/70',
    glowColor: 'rgba(244,114,182,0.4)', glowColor2: 'rgba(251,207,232,0.2)',
    glowBg: 'rgba(244,114,182,0.15)', textGlow: 'rgba(244,114,182,0.9)', textGlow2: 'rgba(251,207,232,0.6)',
    fallbackBg: 'from-pink-500/40 to-rose-600/40', fallbackText: 'text-pink-200',
    badge: 'PRENSES', badgeGradient: 'from-pink-500 to-rose-600', badgeGlow: 'rgba(244,114,182,0.8)', badgeSize: 'text-[8px]',
    topIcon: '👸', topIconGlow: 'rgba(244,114,182,0.9)',
    decorCount: 8, decorRadius: 55,
    renderDecoration: (i, dying) => svgDecor(i, dying, {
      viewBox: '0 0 24 24', paths: [{ d: HEART_PATH }], fill: '#f472b6', size: 'w-3.5 h-3.5',
      anim: 'circle-decor-beat', filter: 'drop-shadow(0 0 4px rgba(244, 114, 182, 0.8))', delayStep: 0.1,
    }),
  },

  // ÖZEL VIP — para/altın/arba çember
  special_vip: {
    borderColor: 'border-yellow-500/70',
    glowColor: 'rgba(251,191,36,0.4)', glowColor2: 'rgba(253,224,71,0.2)',
    glowBg: 'rgba(251,191,36,0.15)', textGlow: 'rgba(251,191,36,0.9)', textGlow2: 'rgba(253,224,71,0.6)',
    fallbackBg: 'from-yellow-500/40 to-amber-600/40', fallbackText: 'text-yellow-200',
    badge: 'ÖZEL VIP', badgeGradient: 'from-yellow-500 to-amber-600', badgeGlow: 'rgba(251,191,36,0.8)', badgeSize: 'text-[8px]',
    topIcon: '💰', topIconGlow: 'rgba(251,191,36,0.9)',
    decorCount: 8, decorRadius: 55,
    decorEmojis: ['💰', '💵', '🚗', '💎'],
    renderDecoration: (i, dying) => emojiDecor(i, dying, {
      emoji: ['💰', '💵', '🚗', '💎'][i % 4], anim: 'circle-decor-spin', delayStep: 0.1,
    }),
  },
};