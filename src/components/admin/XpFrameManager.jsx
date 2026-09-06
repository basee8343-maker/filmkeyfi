import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const STYLES = [
  ['starter', 'Başlangıç'], ['blue', 'Mavi'], ['green', 'Yeşil'], ['cyan', 'Cyan'],
  ['violet', 'Mor'], ['pink', 'Pembe'], ['fire', 'Ateş'], ['gold', 'Altın'], ['ice', 'Buz'], ['legend', 'Efsane'],
];

export default function XpFrameManager() {
  const { toast } = useToast();
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [minXp, setMinXp] = useState('0');
  const [style, setStyle] = useState('starter');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = () => base44.entities.XpFrame.list('-min_xp', 100).then((items) => { setFrames(items); setLoading(false); });
  useEffect(() => { load(); const off = base44.entities.XpFrame.subscribe(load); return off; }, []);

  const pick = (selected) => { setFile(selected); if (selected) setPreview(URL.createObjectURL(selected)); else setPreview(''); };

  const save = async () => {
    if (!name.trim() || !file) return toast({ title: 'Çerçeve adı ve görsel gerekli', variant: 'destructive' });
    setSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.XpFrame.create({ name: name.trim(), min_xp: Math.max(0, Number(minXp) || 0), style, image_url: file_url, active: true, animated: true, sort_order: Math.max(0, Number(minXp) || 0) });
      setName(''); setFile(null); setPreview(''); setMinXp('0'); setStyle('starter');
      toast({ title: 'Level çerçevesi eklendi' });
    } catch (error) { toast({ title: 'Eklenemedi', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const update = async (id, field, value) => {
    setBusy(id);
    try { await base44.entities.XpFrame.update(id, { [field]: value }); toast({ title: 'Güncellendi' }); }
    catch (error) { toast({ title: 'Güncellenemedi', description: error.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const remove = async (id, frameName) => {
    if (!confirm(`"${frameName}" level çerçevesi silinsin mi?`)) return;
    setBusy(id);
    try { await base44.entities.XpFrame.delete(id); toast({ title: 'Level çerçevesi silindi' }); }
    catch (error) { toast({ title: 'Silinemedi', description: error.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  return <section className="mb-4 rounded-xl border border-border bg-card p-4">
    <h2 className="text-lg font-bold">Level (XP) Çerçeveleri</h2>
    <p className="mb-4 text-sm text-muted-foreground">Odadaki seviye çerçevesi görsellerini yükleyin, XP eşiğini ayarlayın ve silin. Onayladığınızda kullanıcıların level çerçevesi güncellenir.</p>
    <div className="space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Çerçeve adı (örn. LVL 50)" className="min-h-12 w-full rounded-xl border border-border bg-secondary px-3 text-base" />
      <label className="block text-sm font-bold">Minimum XP
        <input type="number" min="0" value={minXp} onChange={(e) => setMinXp(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-secondary px-3 text-base" />
      </label>
      <label className="block text-sm font-bold">Stil / Renk
        <select value={style} onChange={(e) => setStyle(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-secondary px-3 text-base">
          {STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block min-h-14 cursor-pointer rounded-xl border-2 border-dashed border-border bg-secondary/40 px-4 text-center text-base font-bold leading-[3.25rem]">
        {file ? '✓ Görsel Seçildi (değiştirmek için dokun)' : '＋ Çerçeve Görseli Yükle'}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0] || null)} />
      </label>
      {preview && <img src={preview} alt="Önizleme" className="mx-auto h-32 w-32 object-contain" />}
      <button onClick={save} disabled={saving || !file || !name.trim()} className="min-h-14 w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Level Çerçevesi Ekle'}</button>
    </div>
    <div className="mt-4 space-y-2">
      <h3 className="text-sm font-bold">Mevcut Level Çerçeveleri ({frames.length})</h3>
      {loading && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
      {frames.map((frame) => <div key={frame.id} className="rounded-xl border border-border bg-secondary/40 p-3">
        <div className="flex items-center gap-3">
          {frame.image_url ? <img src={frame.image_url} alt={frame.name} className="h-14 w-14 shrink-0 object-contain" /> : <div className="h-14 w-14 shrink-0 rounded-lg bg-secondary" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{frame.name}</p>
            <p className="text-xs text-muted-foreground">{frame.min_xp} XP · {frame.style}</p>
          </div>
          <button onClick={() => remove(frame.id, frame.name)} disabled={busy === frame.id} className="min-h-11 shrink-0 rounded-lg bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50">Sil</button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-bold">XP:</span>
          <input type="number" min="0" defaultValue={frame.min_xp} onBlur={(e) => e.target.value != frame.min_xp && update(frame.id, 'min_xp', Math.max(0, Number(e.target.value) || 0))} className="min-h-10 w-24 rounded-lg border border-border bg-background px-2 text-sm" />
          <select defaultValue={frame.style} onChange={(e) => e.target.value !== frame.style && update(frame.id, 'style', e.target.value)} className="min-h-10 flex-1 rounded-lg border border-border bg-background px-2 text-sm">
            {STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>)}
    </div>
  </section>;
}