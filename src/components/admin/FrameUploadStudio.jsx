import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { processFrameFile } from '@/lib/frameProcessor';
import { useFrameCatalog } from '@/lib/FrameCatalogContext';
import { useToast } from '@/components/ui/use-toast';

export default function FrameUploadStudio() {
  const { refreshFrames } = useFrameCatalog();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [source, setSource] = useState(null);
  const [size, setSize] = useState(52);
  const [centerX, setCenterX] = useState(50);
  const [centerY, setCenterY] = useState(50);
  const [preview, setPreview] = useState('');
  const [processed, setProcessed] = useState(null);
  const [saving, setSaving] = useState(false);
  const diameter = size / 100;
  const opening = [Math.max(0, Math.min(1 - diameter, centerX / 100 - diameter / 2)), Math.max(0, Math.min(1 - diameter, centerY / 100 - diameter / 2)), diameter, diameter];
  useEffect(() => {
    if (!source) return;
    let active = true; let url = '';
    processFrameFile(source, opening).then((file) => { if (!active) return; url = URL.createObjectURL(file); setProcessed(file); setPreview(url); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [source, size, centerX, centerY]);
  const save = async () => {
    if (!name.trim() || !processed) return toast({ title: 'Çerçeve adı ve görsel gerekli', variant: 'destructive' });
    setSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: processed });
      await base44.entities.SpecialFrame.create({ name: name.trim(), image_url: file_url, opening, active: true });
      await refreshFrames(); setName(''); setSource(null); setPreview('');
      toast({ title: 'Şeffaf çerçeve kataloğa eklendi' });
    } catch (error) { toast({ title: 'Çerçeve kaydedilemedi', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <section className="mb-4 rounded-xl border border-border bg-card p-4"><h2 className="font-bold">Şeffaf Çerçeve Hazırlama</h2><p className="mb-3 text-xs text-muted-foreground">Görselin kenar arka planını ve profil açıklığını silerek PNG olarak kataloğa ekler.</p><div className="grid gap-4 md:grid-cols-2"><div className="space-y-3"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Çerçeve adı" className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm" /><label className="block rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-3 text-center text-sm font-semibold">Görsel Yükle<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setSource(e.target.files?.[0] || null)} /></label>{[['Profil boşluğu', size, setSize, 30, 75], ['Merkez X', centerX, setCenterX, 30, 70], ['Merkez Y', centerY, setCenterY, 30, 70]].map(([label, value, setter, min, max]) => <label key={label} className="block text-xs font-semibold"><span className="mb-1 flex justify-between"><span>{label}</span><span>%{value}</span></span><input type="range" min={min} max={max} value={value} onChange={(e) => setter(Number(e.target.value))} className="w-full accent-primary" /></label>)}<button onClick={save} disabled={saving || !processed} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? 'Hazırlanıyor...' : 'Şeffaf PNG Olarak Kaydet'}</button></div><div className="flex min-h-64 items-center justify-center rounded-xl bg-secondary/40 p-3">{preview ? <img src={preview} alt="Şeffaf çerçeve önizlemesi" className="h-64 w-64 object-contain" /> : <p className="text-sm text-muted-foreground">Önizleme için görsel yükleyin.</p>}</div></div></section>;
}