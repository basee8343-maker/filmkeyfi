export const FRAME_STYLES = {
  starter: { colors: ['#9ca3af', '#e5e7eb'], glow: '#9ca3af', label: 'Normal' },
  blue: { colors: ['#3b82f6', '#93c5fd'], glow: '#3b82f6', label: 'Mavi' },
  green: { colors: ['#22c55e', '#a7f3d0'], glow: '#22c55e', label: 'Yeşil' },
  cyan: { colors: ['#06b6d4', '#67e8f9'], glow: '#06b6d4', label: 'Turkuaz' },
  violet: { colors: ['#8b5cf6', '#d8b4fe'], glow: '#8b5cf6', label: 'Mor' },
  pink: { colors: ['#ec4899', '#f9a8d4'], glow: '#ec4899', label: 'Pembe' },
  fire: { colors: ['#ff4500', '#fbbf24'], glow: '#ff6b00', label: 'Ateş' },
  gold: { colors: ['#fbbf24', '#fff7cc'], glow: '#fbbf24', label: 'Altın' },
  ice: { colors: ['#38bdf8', '#e0f2fe'], glow: '#7dd3fc', label: 'Buz' },
  legend: { colors: ['#ff1744', '#fbbf24'], glow: '#ff1744', label: 'Efsanevi' },
};

export const FALLBACK_FRAME = { id: 'fallback', name: 'Başlangıç', min_xp: 0, style: 'starter', animated: false };

export const frameStyle = (frame) => FRAME_STYLES[frame?.style] || FRAME_STYLES.starter;
export const xpValue = (row) => Math.max(0, Math.floor(Number(row?.xp) || 0));
export const formatXp = (value) => new Intl.NumberFormat('tr-TR').format(Math.max(0, Math.floor(Number(value) || 0)));
export const daysInApp = (createdDate) =>
  createdDate ? Math.max(0, Math.floor((Date.now() - new Date(createdDate).getTime()) / 86400000)) : 0;

// Manuel admin çerçevesi her zaman otomatik XP çerçevesinden önceliklidir.
export function resolveFrame(frames, xp, manualFrameId) {
  const list = (frames || []).filter((frame) => frame.active !== false).sort((a, b) => (a.min_xp || 0) - (b.min_xp || 0));
  if (manualFrameId) {
    const manual = (frames || []).find((frame) => frame.id === manualFrameId);
    if (manual) return { current: manual, next: null, manual: true };
  }
  if (!list.length) return { current: FALLBACK_FRAME, next: null, manual: false };
  let current = list[0];
  let next = null;
  list.forEach((frame) => {
    if (xp >= (frame.min_xp || 0)) current = frame;
    else if (!next) next = frame;
  });
  return { current, next, manual: false };
}

export function xpProgress(xp, current, next) {
  if (!next) return { percent: 100, remaining: 0 };
  const start = current?.min_xp || 0;
  const span = Math.max(1, (next.min_xp || 0) - start);
  return {
    percent: Math.min(100, Math.max(0, Math.round(((xp - start) / span) * 100))),
    remaining: Math.max(0, (next.min_xp || 0) - xp),
  };
}