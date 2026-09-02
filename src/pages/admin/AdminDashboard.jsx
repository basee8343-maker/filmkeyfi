import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Users, Film, DoorOpen, LifeBuoy, CreditCard, TrendingUp, Activity, Trash2, Tv, CheckCircle2, Clock3 } from 'lucide-react';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const clearLogs = async () => { await base44.entities.AdminLog.deleteMany({}); setLogs([]); toast({ title: 'Tüm aktiviteler silindi' }); };

  useEffect(() => {
    (async () => {
      try {
        const [users, movies, series, rooms, tickets, payments] = await Promise.all([
          base44.entities.User.list(500).catch(() => []),
          base44.entities.Movie.filter({ type: 'movie' }, '-views', 500).catch(() => []),
          base44.entities.Movie.filter({ type: 'series' }, '-views', 500).catch(() => []),
          base44.entities.Room.list(500).catch(() => []),
          base44.entities.SupportTicket.list(500).catch(() => []),
          base44.entities.Payment.list(500).catch(() => []),
        ]);
        const active = users.filter((u) => u.membership_status === 'active');
        const expired = users.filter((u) => u.membership_status === 'expired' || (u.membership_end && new Date(u.membership_end) < new Date()));
        const renewals = await base44.entities.MembershipRenewal.filter({ status: 'pending' }, '-created_date', 100).catch(() => []);
        const revenue = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
        setStats({
          totalUsers: users.length, activeMembers: active.length, expiredMembers: expired.length,
          renewals: renewals.length, movies: movies.length, series: series.length,
          activeRooms: rooms.filter((r) => r.status === 'active').length, openTickets: tickets.filter((t) => t.status !== 'closed').length,
          revenue,
        });
        const lg = await base44.entities.AdminLog.list(10).catch(() => []);
        setLogs(lg);
      } finally { setLoading(false); }
    })();
  }, []);

  const cards = [
    { label: 'Toplam Kullanıcı', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
    { label: 'Aktif Üyelik', value: stats.activeMembers, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Süresi Biten', value: stats.expiredMembers, icon: Activity, color: 'text-amber-400' },
    { label: 'Yenileme Bekleyen', value: stats.renewals, icon: Activity, color: 'text-purple-400' },
    { label: 'Toplam Film', value: stats.movies, icon: Film, color: 'text-red-400' },
    { label: 'Aktif Odalar', value: stats.activeRooms, icon: DoorOpen, color: 'text-cyan-400' },
    { label: 'Açık Destek', value: stats.openTickets, icon: LifeBuoy, color: 'text-orange-400' },
    { label: 'Gelir (₺)', value: stats.revenue, icon: CreditCard, color: 'text-emerald-400' },
  ];

  const activeRate = stats.totalUsers ? Math.round((stats.activeMembers / stats.totalUsers) * 100) : 0;

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-extrabold">Dashboard</h1><p className="text-sm text-muted-foreground mt-1">Platformun güncel durumunu ve yönetim aktivitelerini takip edin.</p></div>
        <p className="hidden sm:block text-xs text-muted-foreground">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-extrabold">{c.value ?? 0}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-400" /></div><div><p className="text-xl font-bold">%{activeRate}</p><p className="text-xs text-muted-foreground">Aktif üyelik oranı</p></div></div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Tv className="w-5 h-5 text-primary" /></div><div><p className="text-xl font-bold">{(stats.movies || 0) + (stats.series || 0)}</p><p className="text-xs text-muted-foreground">Toplam içerik</p></div></div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock3 className="w-5 h-5 text-amber-400" /></div><div><p className="text-xl font-bold">{stats.openTickets || 0}</p><p className="text-xs text-muted-foreground">Yanıt bekleyen destek</p></div></div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Son Aktiviteler</h3>
          {logs.length > 0 && <button onClick={clearLogs} className="inline-flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> Tümünü Sil</button>}
        </div>
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">Henüz aktivite kaydı yok.</p> :
          <div className="space-y-2">{logs.map((l) => <div key={l.id} className="text-sm flex justify-between border-b border-border last:border-0 py-1.5"><span>{l.action} {l.target && <span className="text-muted-foreground">· {l.target}</span>}</span><span className="text-xs text-muted-foreground">{new Date(l.created_date).toLocaleString('tr-TR')}</span></div>)}</div>}
      </div>
    </div>
  );
}