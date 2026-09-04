import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, CheckCircle, Clock, Check, Landmark, TrendingUp } from 'lucide-react';

export default function PaymentsDashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, approved: 0, bankPending: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [subs, payments] = await Promise.all([
          base44.entities.Subscription.list('-created_date', 500),
          base44.entities.Payment.list('-created_date', 500),
        ]);
        const active = subs.filter((s) => s.status === 'active').length;
        const pending = payments.filter((p) => p.status === 'pending').length;
        const approved = payments.filter((p) => p.status === 'approved').length;
        const bankPending = payments.filter((p) => p.status === 'pending' && p.payment_method === 'bank_transfer').length;
        const revenue = payments.filter((p) => p.status === 'approved').reduce((sum, p) => sum + (p.amount || 0), 0);
        setStats({ total: subs.length, active, pending, approved, bankPending, revenue });
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;

  const cards = [
    { label: 'Toplam Abonelik', value: stats.total, icon: Users, color: '#7c3aed' },
    { label: 'Aktif Abonelik', value: stats.active, icon: CheckCircle, color: '#22c55e' },
    { label: 'Bekleyen Ödemeler', value: stats.pending, icon: Clock, color: '#f59e0b' },
    { label: 'Onaylanan Ödemeler', value: stats.approved, icon: Check, color: '#3b82f6' },
    { label: 'Bekleyen Banka Transferleri', value: stats.bankPending, icon: Landmark, color: '#ec4899' },
    { label: 'Toplam Gelir', value: `${stats.revenue.toLocaleString('tr-TR')} ₺`, icon: TrendingUp, color: '#22c55e' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="bg-[#16161e] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${c.color}20` }}>
                <Icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
          </div>
        );
      })}
    </div>
  );
}