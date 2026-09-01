import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Clock } from 'lucide-react';

export default function AdminPaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Payment.list(200).then((p) => { setPayments(p); setLoading(false); }).catch(() => setLoading(false));
    const unsub = base44.entities.Payment.subscribe((ev) => {
      if (ev.type === 'create') setPayments((prev) => [ev.data, ...prev]);
      if (ev.type === 'update') setPayments((prev) => prev.map((x) => x.id === ev.data.id ? { ...x, ...ev.data } : x));
    });
    return unsub;
  }, []);

  const statusBadge = (s) => {
    if (s === 'completed') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500"><Check className="w-3 h-3" /> Başarılı</span>;
    if (s === 'failed') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500"><X className="w-3 h-3" /> Başarısız</span>;
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500"><Clock className="w-3 h-3" /> Bekliyor</span>;
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Ödeme Geçmişi</h1>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz ödeme kaydı yok.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 px-3 font-semibold">Kullanıcı</th>
                  <th className="py-2 px-3 font-semibold">Tutar</th>
                  <th className="py-2 px-3 font-semibold">Tarih</th>
                  <th className="py-2 px-3 font-semibold">Sağlayıcı</th>
                  <th className="py-2 px-3 font-semibold">Durum</th>
                  <th className="py-2 px-3 font-semibold">Sipariş ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="py-2.5 px-3">{p.user_name || '—'}</td>
                    <td className="py-2.5 px-3 font-semibold">{p.amount} ₺</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{new Date(p.created_date).toLocaleString('tr-TR')}</td>
                    <td className="py-2.5 px-3 capitalize">{p.provider || 'shopier'}</td>
                    <td className="py-2.5 px-3">{statusBadge(p.status)}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{p.shopier_order_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{p.user_name || '—'}</p>
                  {statusBadge(p.status)}
                </div>
                <p className="text-lg font-bold">{p.amount} ₺</p>
                <p className="text-xs text-muted-foreground">{new Date(p.created_date).toLocaleString('tr-TR')}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">{p.shopier_order_id || '—'}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}