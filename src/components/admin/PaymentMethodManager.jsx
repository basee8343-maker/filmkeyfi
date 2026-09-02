import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react';

export default function PaymentMethodManager() {
  const { toast } = useToast();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider: '', display_name: '', description: '', enabled: false, sort_order: 0 });

  const load = async () => {
    const items = await base44.entities.PaymentMethod.list('-sort_order', 50).catch(() => []);
    setMethods(items);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.PaymentMethod.subscribe(() => load());
    return () => unsub();
  }, []);

  const toggle = async (method) => {
    try {
      await base44.entities.PaymentMethod.update(method.id, { enabled: !method.enabled });
      toast({ title: method.enabled ? 'Ödeme yöntemi pasif yapıldı' : 'Ödeme yöntemi aktif yapıldı' });
    } catch { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
  };

  const remove = async (method) => {
    try {
      await base44.entities.PaymentMethod.delete(method.id);
      toast({ title: 'Ödeme yöntemi silindi' });
    } catch { toast({ title: 'Silinemedi', variant: 'destructive' }); }
  };

  const move = async (method, dir) => {
    const sorted = [...methods].sort((a, b) => b.sort_order - a.sort_order);
    const idx = sorted.findIndex((m) => m.id === method.id);
    const swap = dir === 'up' ? sorted[idx - 1] : sorted[idx + 1];
    if (!swap) return;
    try {
      await base44.entities.PaymentMethod.bulkUpdate([
        { id: method.id, sort_order: swap.sort_order },
        { id: swap.id, sort_order: method.sort_order },
      ]);
    } catch { toast({ title: 'Sıralama değiştirilemedi', variant: 'destructive' }); }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.PaymentMethod.create({ ...form, sort_order: form.sort_order || methods.length });
      setShowForm(false);
      setForm({ provider: '', display_name: '', description: '', enabled: false, sort_order: 0 });
      toast({ title: 'Ödeme yöntemi eklendi' });
    } catch { toast({ title: 'Eklenemedi', variant: 'destructive' }); }
  };

  if (loading) return <div className="h-32 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const sorted = [...methods].sort((a, b) => b.sort_order - a.sort_order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold">Ödeme Yöntemleri</h2>
          <p className="text-sm text-muted-foreground">Aktif yapılan yöntemler kullanıcı ödeme ekranında anlık görünür. Pasif yapılanlar tamamen gizlenir ve backend ödemeyi reddeder.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
          <Plus className="w-4 h-4" /> Yöntem Ekle
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Yeni Ödeme Yöntemi</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="provider (shopier, paytr...)" className="bg-secondary rounded-lg px-3 py-2 text-sm outline-none" required />
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Görünen ad" className="bg-secondary rounded-lg px-3 py-2 text-sm outline-none" required />
          </div>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Açıklama (opsiyonel)" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-4 h-4" />
            Hemen aktif et
          </label>
          <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold">Kaydet</button>
        </form>
      )}

      <div className="space-y-2">
        {sorted.map((method, idx) => (
          <div key={method.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-semibold">{method.display_name}</p>
                <p className="text-xs text-muted-foreground">{method.provider}{method.description ? ` — ${method.description}` : ''}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${method.enabled ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>{method.enabled ? 'Aktif' : 'Pasif'}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => move(method, 'up')} disabled={idx === 0} className="p-1.5 rounded hover:bg-secondary disabled:opacity-30" title="Yukarı"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => move(method, 'down')} disabled={idx === sorted.length - 1} className="p-1.5 rounded hover:bg-secondary disabled:opacity-30" title="Aşağı"><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => toggle(method)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${method.enabled ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground'}`}>{method.enabled ? 'Pasif Yap' : 'Aktif Yap'}</button>
              <button onClick={() => remove(method)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Sil"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {!sorted.length && <p className="text-center text-sm text-muted-foreground py-8">Henüz ödeme yöntemi eklenmedi. "Yöntem Ekle" butonundan ekleyin.</p>}
      </div>
    </div>
  );
}