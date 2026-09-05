import { Crown, Sparkles } from 'lucide-react';

const tiers = [
  { max: 10, shell: 'border-violet-500/40 bg-violet-500/10 text-violet-300', glow: 'shadow-violet-500/20' },
  { max: 25, shell: 'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300', glow: 'shadow-fuchsia-500/30' },
  { max: 50, shell: 'border-pink-500/60 bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-pink-200', glow: 'shadow-pink-500/40' },
  { max: 100, shell: 'border-cyan-400/60 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 text-cyan-200', glow: 'shadow-cyan-400/40' },
  { max: 250, shell: 'border-blue-400/70 bg-blue-500/15 text-blue-100', glow: 'shadow-blue-400/50' },
  { max: 500, shell: 'border-purple-300/70 bg-gradient-to-r from-purple-600/25 to-fuchsia-500/20 text-purple-100', glow: 'shadow-purple-400/60' },
  { max: 750, shell: 'border-amber-400/70 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-100', glow: 'shadow-amber-400/60' },
  { max: 999, shell: 'border-red-400/80 bg-gradient-to-r from-red-600/25 to-orange-500/20 text-red-100', glow: 'shadow-red-500/70' },
  { max: 1000, shell: 'border-amber-200 bg-gradient-to-r from-amber-400/30 via-yellow-200/20 to-amber-500/30 text-amber-50', glow: 'shadow-amber-300/80' },
];

export default function FriendshipLevelBadge({ level = 1, room = false }) {
  const safeLevel = Math.min(1000, Math.max(1, Number(level) || 1));
  const tier = tiers.find((item) => safeLevel <= item.max) || tiers[8];
  const animated = safeLevel >= 26 ? 'friendship-level-energy' : safeLevel >= 11 ? 'friendship-level-shine' : '';
  return <span className={`relative inline-flex shrink-0 items-center justify-center border font-black shadow-lg ${tier.shell} ${tier.glow} ${animated} ${room ? 'h-12 min-w-14 rounded-[45%] px-2' : 'h-7 rounded-full px-2 text-[10px]'}`}><Sparkles className={`${room ? 'w-3.5 h-3.5' : 'w-3 h-3'} mr-1 opacity-80`} />{room && <Crown className="absolute -top-3 w-5 h-5 text-amber-300" />}<span>LVL {safeLevel}</span>{safeLevel >= 51 && <i className="friendship-level-particle" />}</span>;
}