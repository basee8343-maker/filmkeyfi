import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Pencil, X, Sparkles } from 'lucide-react';

export default function AdminUpdates() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', version: '', body: '', active: true });

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.UpdateAnnouncement.list('-created_date', 50);
      setItems(data);
    } catch (e) {
      toast({ title: 'Yüklenemedi', variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ title: '', version: '', body: '', active: true }); setShowForm(true); };
  const openEdit = (item) => { setEditing(item); setForm({ title: item.title, version: item.version || '', body: item.body, active: item.active }); setShowForm(true); };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: 'Başlık ve içerik zorunlu', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await base44.entities.UpdateAnnouncement.update(editing.id, form);
        toast({ title: 'Duyuru güncellendi' });
      } else {
        await base44.entities.UpdateAnnouncement.create(form);
        toast({ title: 'Duyuru oluşturuldu', description: 'Kullanıcılar uygulamaya girdiğinde görecek.' });
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast({ title: 'Kaydedilemedi', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (id) => {
    if (!confirm('Bu duyuru silinsin mi?')) return;
    try {
      await base44.entities.UpdateAnnouncement.delete(id);
      toast({ title: 'Silindi' });
      load();
    } catch (e) {
      toast({ title: 'Silinemedi', variant: 'destructive' });
    }
  };

  const toggleActive = async (item) => {
    try {
      await base44.entities.UpdateAnnouncement.update(item.id, { active: !item.active });
      load();
    } catch (e) {
      toast({ title: 'Güncellenemedi', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Güncelleme Duyuruları</h1>
          <p className="text-sm text-muted-foreground mt-1">Yayınladığın güncellemeleri kullanıcılara otomatik göster.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #8B31FF, #5F24A1)' }}>
          <Plus className="w-4 h-4" /> Yeni Duyuru
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border">
          <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Henüz duyuru yok. İlk duyurunu oluştur.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold truncate">{item.title}</h3>
                    {item.version && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">v{item.version}</span>}
                    <button onClick={() => toggleActive(item)} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                      {item.active ? 'Aktif' : 'Pasif'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{new Date(item.created_date).toLocaleString('tr-TR')}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">{item.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(item.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="font-bold text-lg">{editing ? 'Duyuruyu Düzenle' : 'Yeni Güncelleme Duyurusu'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Başlık *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Örn: Yeni Sohbet Özellikleri"
                  className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Sürüm (opsiyonel)</label>
                <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="Örn: 2.4.1"
                  className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">İçerik *</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={8} placeholder={"Neler güncellendi? Her satıra bir madde yaz.\n\nÖrn:\n- Sohbet paneline emoji reaksiyonları eklendi\n- Video oynatıcı performansı iyileştirildi\n- Hata düzeltmeleri yapıldı"}
                  className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-y" />
                <p className="text-xs text-muted-foreground mt-1">Satır sonları korunur. Kullanıcılar bunu olduğu gibi görür.</p>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Aktif (kullanıcılara göster)</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2 sticky bottom-0 bg-card">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg bg-secondary text-sm font-semibold">İptal</button>
              <button onClick={save} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #8B31FF, #5F24A1)' }}>{editing ? 'Güncelle' : 'Yayınla'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}