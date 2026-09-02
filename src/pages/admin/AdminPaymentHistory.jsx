import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Clock, Ban, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/use-toast';

export default function AdminPaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmOne, setConfirmOne] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Payment.list(200).then((p) => { setPayments(p); setLoading(false); }).catch(() => setLoading(false));
    const unsub = base44.entities.Payment.subscribe((ev) => {
      if (ev.type === 'create') setPayments((prev) => [ev.data, ...prev]);
      if (ev.type === 'update') setPayments((prev) => prev.map((x) => x.id === ev.data.id ? { ...x, ...ev.data } : x));
      if (ev.type === 'delete') setPayments((prev) => prev.filter((x) => x.id !== ev.data.id));
    });
    return unsub;
  }, []);

  const statusBadge = (s) => {
    if (s === 'completed') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500"><Check className="w-3 h-3" /> Ödeme Yapıldı</span>;
    if (s === 'failed') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500"><X className="w-3 h-3" /> Başarısız</span>;
    if (s === 'cancelled') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-500"><Ban className="w-3 h-3" /> İptal</span>;
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500"><Clock className="w-3 h-3" /> Bekliyor</span>;
  };

  const processedBadge = (s) => {
    if (s === 'completed') return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500"><Check className="w-3 h-3" /> İşlendi</span>;
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500"><Clock className="w-3 h-3" /> İşlenmedi</span>;
  };

  const deleteOne = async () => {
    if (!confirmOne) return;
    setDeleting(true);
    try {
      await base44.entities.Payment.delete(confirmOne.id);
      setPayments((prev) => prev.filter((x) => x.id !== confirmOne.id));
      toast({ title: 'Ödeme kaydı silindi' });
    } catch (e) {
      toast({ title: 'Silinemedi', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setConfirmOne(null);
    }
  };

  const deleteAll = async () => {
    setDeleting(true);
    try {
      await base44.entities.Payment.deleteMany({});
      setPayments([]);
      toast({ title: 'Tüm ödeme kayıtları silindi' });
    } catch (e) {
      toast({ title: 'Silinemedi', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setConfirmAll(false);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">Ödemeler</h1>
        {payments.length > 0 && (
          <button onClick={() => setConfirmAll(true)} className="text-sm bg-destructive/10 text-destructive border border-destructive/30 px-3 py-1.5 rounded-lg font-semibold hover:bg-destructive/20">Tümünü Sil</button>
        )}
      </div>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz ödeme kaydı yok.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 px-3 font-semibold">Kullanıcı</th>
                  <th className="py-2 px-3 font-semibold">E-posta</th>
                  <th className="py-2 px-3 font-semibold">Ürün</th>
                  <th className="py-2 px-3 font-semibold">Tutar</th>
                  <th className="py-2 px-3 font-semibold">Ödeme Tarihi</th>
                  <th className="py-2 px-3 font-semibold">Durum</th>
                  <th className="py-2 px-3 font-semibold">İşlenme</th>
                  <th className="py-2 px-3 font-semibold">Shopier Sipariş ID</th>
                  <th className="py-2 px-3 font-semibold">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="py-2.5 px-3">{p.user_name || '—'}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.user_email || '—'}</td>
                  <td className="py-2.5 px-3">{p.package_name || '—'}</td>
                  <td className="py-2.5 px-3 font-semibold">{p.amount} ₺</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleString('tr-TR') : new Date(p.created_date).toLocaleString('tr-TR')}</td>
                  <td className="py-2.5 px-3">{statusBadge(p.status)}</td>
                  <td className="py-2.5 px-3">{processedBadge(p.status)}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{p.shopier_order_id || '—'}</td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => setConfirmOne(p)} className="text-xs bg-destructive/10 text-destructive border border-destructive/30 px-2.5 py-1 rounded font-semibold hover:bg-destructive/20">Sil</button>
                  </td>
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
                <p className="text-xs text-muted-foreground mb-1">{p.user_email || '—'}</p>
                <p className="text-xs text-muted-foreground mb-1">{p.package_name || '—'}</p>
                <p className="text-lg font-bold">{p.amount} ₺</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleString('tr-TR') : new Date(p.created_date).toLocaleString('tr-TR')}</p>
                  {processedBadge(p.status)}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">{p.shopier_order_id || '—'}</p>
                <button onClick={() => setConfirmOne(p)} className="mt-2 text-xs bg-destructive/10 text-destructive border border-destructive/30 px-2.5 py-1 rounded font-semibold hover:bg-destructive/20">Sil</button>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Tüm ödeme kayıtlarını sil?"
        description={`${payments.length} adet ödeme kaydının tamamı kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        confirmText="Tümünü Sil"
        onConfirm={deleteAll}
      />
      <ConfirmDialog
        open={!!confirmOne}
        onOpenChange={(o) => !o && setConfirmOne(null)}
        title="Ödeme kaydını sil?"
        description="Bu ödeme kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz."
        confirmText="Sil"
        onConfirm={deleteOne}
      />
    </div>
  );
}