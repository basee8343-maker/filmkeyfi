import { Crown } from 'lucide-react';

export const getRoomLevelTier = (value) => {
  const level = Math.min(1000, Math.max(1, Math.floor(Number(value) || 1)));
  return level <= 10 ? 'basic' : level <= 50 ? 'blue' : level <= 100 ? 'violet' : level <= 250 ? 'pink' : level <= 500 ? 'gold' : level <= 750 ? 'red' : level <= 999 ? 'premium' : 'max';
};

export default function RoomLevelBadge({ level, profile = false, textOnly = false }) {
  if (level === undefined) return <span className="inline-flex shrink-0 rounded-lg border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground" aria-label="Seviye yükleniyor">LVL …</span>;
  const value = Math.min(1000, Math.max(1, Math.floor(Number(level) || 1)));
  return <span data-level-tier={getRoomLevelTier(value)} className={`room-level-badge relative isolate inline-flex max-w-full shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border font-bold leading-none ${profile ? 'room-level-profile px-4 py-2.5 text-base' : 'px-2 py-1.5 text-[10px]'}`} aria-label={`Seviye ${value}${value === 1000 ? ', maksimum seviye' : ''}`}>
    {value === 1000 && !textOnly && <Crown className="h-4 w-4 shrink-0" aria-hidden="true" />}
    <span className="relative">LVL {value}</span>{value === 1000 && <small className="relative text-[9px]">MAX</small>}
  </span>;
}