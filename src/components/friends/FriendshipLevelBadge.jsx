import { Crown, Sparkles } from 'lucide-react';

const privateTiers = [
  { max: 10, shell: 'border-violet-500/50 bg-violet-500/10 text-violet-300', bubble: 'ring-1 ring-violet-500/35 shadow-violet-500/20', progress: 'from-violet-600 to-violet-400', frame: 'friendship-frame-basic' },
  { max: 25, shell: 'border-fuchsia-500/60 bg-fuchsia-500/10 text-fuchsia-200', bubble: 'ring-1 ring-fuchsia-500/45 shadow-fuchsia-500/30', progress: 'from-violet-500 to-fuchsia-500', frame: 'friendship-frame-glow' },
  { max: 50, shell: 'border-pink-400/70 bg-gradient-to-br from-violet-600/30 to-pink-500/20 text-pink-100', bubble: 'ring-1 ring-pink-500/55 shadow-pink-500/40', progress: 'from-violet-500 to-pink-500', frame: 'friendship-frame-neon' },
  { max: 100, shell: 'border-cyan-300/70 bg-gradient-to-br from-blue-600/30 to-cyan-400/20 text-cyan-100', bubble: 'ring-1 ring-cyan-400/55 shadow-cyan-400/40', progress: 'from-blue-500 to-cyan-400', frame: 'friendship-frame-aura' },
  { max: 250, shell: 'border-blue-300/80 bg-gradient-to-br from-indigo-600/30 to-blue-400/20 text-blue-50', bubble: 'ring-1 ring-blue-400/60 shadow-blue-500/50', progress: 'from-indigo-500 to-blue-400', frame: 'friendship-frame-premium' },
  { max: 500, shell: 'border-purple-200/80 bg-gradient-to-br from-purple-700/35 to-fuchsia-400/20 text-purple-50', bubble: 'ring-1 ring-purple-300/65 shadow-purple-400/60', progress: 'from-purple-500 to-fuchsia-400', frame: 'friendship-frame-rare' },
  { max: 750, shell: 'border-amber-300/80 bg-gradient-to-br from-amber-600/30 to-orange-400/20 text-amber-50', bubble: 'ring-1 ring-amber-400/65 shadow-amber-400/60', progress: 'from-amber-500 to-orange-400', frame: 'friendship-frame-elite' },
  { max: 999, shell: 'border-red-300/90 bg-gradient-to-br from-red-700/35 to-orange-500/25 text-red-50', bubble: 'ring-1 ring-red-400/70 shadow-red-500/70', progress: 'from-red-500 to-orange-400', frame: 'friendship-frame-legend' },
  { max: 1000, shell: 'border-amber-100 bg-gradient-to-br from-amber-400/40 via-yellow-100/20 to-orange-500/30 text-amber-50', bubble: 'ring-2 ring-amber-200/80 shadow-amber-300/80', progress: 'from-amber-300 via-yellow-100 to-amber-500', frame: 'friendship-frame-max' },
];
const roomTiers = [privateTiers[0], privateTiers[1], privateTiers[2], privateTiers[3], privateTiers[6], privateTiers[8]];
const roomLimits = [10, 25, 50, 75, 99, 100];

export function getFriendshipLevelTheme(level = 1, maxLevel = 1000) {
  const safeLevel = Math.min(maxLevel, Math.max(1, Number(level) || 1));
  const tiers = maxLevel === 100 ? roomTiers.map((tier, index) => ({ ...tier, max: roomLimits[index] })) : privateTiers;
  return { level: safeLevel, ...(tiers.find((tier) => safeLevel <= tier.max) || tiers[tiers.length - 1]) };
}

export default function FriendshipLevelBadge({ level = 1, variant = 'compact', maxLevel = 1000 }) {
  const theme = getFriendshipLevelTheme(level, maxLevel);
  const motion = theme.level >= 26 ? 'friendship-level-energy' : theme.level >= 11 ? 'friendship-level-shine' : '';
  if (variant === 'room') return <span className={`relative inline-flex h-11 min-w-16 shrink-0 items-center justify-center rounded-2xl border px-2 text-xs font-black shadow-lg ${theme.shell} ${theme.frame} ${motion}`}><Crown className="absolute -top-3 h-5 w-5 text-amber-300" /><Sparkles className="mr-1 h-3 w-3" />LVL {theme.level}{theme.level >= 51 && <i className="friendship-level-particle" />}</span>;
  if (variant === 'list') return <span className={`relative inline-flex h-12 w-16 shrink-0 items-center justify-center border text-[10px] font-black shadow-lg ${theme.shell} ${theme.frame} ${motion}`}><Sparkles className="absolute -left-2 h-5 w-5 opacity-80" /><span className="text-center leading-tight">LVL<br /><b className="text-sm">{theme.level}</b></span><Sparkles className="absolute -right-2 h-5 w-5 opacity-80" />{theme.level >= 51 && <i className="friendship-level-particle" />}</span>;
  if (variant === 'card') return <span className={`relative inline-flex h-20 w-20 shrink-0 flex-col items-center justify-center border font-black shadow-xl ${theme.shell} ${theme.frame} ${motion}`}><Crown className="mb-1 h-5 w-5" /><small className="text-[9px]">LVL</small><strong className="text-2xl leading-none">{theme.level}</strong>{theme.level >= 51 && <i className="friendship-level-particle" />}</span>;
  return <span className={`relative inline-flex h-7 shrink-0 items-center rounded-full border px-2 text-[10px] font-black shadow-md ${theme.shell} ${motion}`}>LVL {theme.level}</span>;
}