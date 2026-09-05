import { formatXp, frameStyle } from '@/lib/xp';

// Profil ve profil önizlemesinde ortak XP paneli — mesaj sayısı asla gösterilmez.
export default function XpStatsCard({ stats, days, compact = false }) {
  if (!stats) return null;
  const style = frameStyle(stats.frame);
  return (
    <div className="w-full min-w-0 rounded-2xl border border-border bg-secondary/40 p-3 sm:p-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-extrabold" style={{ color: style.colors[0], background: `${style.colors[0]}1f` }}>
          ⚡ {formatXp(stats.xp)} XP
        </span>
        <span className="text-xs font-semibold text-amber-400">🔥 {days} Gündür Uygulamada</span>
      </div>
      <p className="mt-2.5 text-xs font-semibold text-muted-foreground">🏆 Mevcut Çerçeve: <span className="font-bold" style={{ color: style.colors[0] }}>{stats.frame?.name || 'Başlangıç'}</span></p>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full transition-all" style={{ width: `${stats.percent}%`, background: `linear-gradient(90deg, ${style.colors[0]}, ${style.colors[1]})` }} />
      </div>
      {stats.manual ? (
        <p className="mt-2 text-[11px] font-semibold text-primary">Özel çerçeve atanmış</p>
      ) : stats.nextFrame ? (
        <div className={`mt-2 flex flex-wrap justify-between gap-1 text-[11px] ${compact ? '' : 'sm:text-xs'}`}>
          <span className="text-muted-foreground">📊 Sonraki Çerçeve: <span className="font-bold text-foreground">{stats.nextFrame.name}</span></span>
          <span className="font-semibold text-muted-foreground">Kalan XP: {formatXp(stats.remaining)}</span>
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-bold text-amber-400">En yüksek çerçeveye ulaştın!</p>
      )}
    </div>
  );
}