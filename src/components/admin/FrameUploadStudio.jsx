import { useState } from 'react';
import MobileFrameEditor from '@/components/admin/frame-editor/MobileFrameEditor';
import { useFrameCatalog } from '@/lib/FrameCatalogContext';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';

export default function FrameUploadStudio() {
  const [open, setOpen] = useState(false);
  const { frames, refreshFrames } = useFrameCatalog();
  const { toast } = useToast();
  const [busy, setBusy] = useState(null);
  const customFrames = Object.entries(frames).filter(([key]) => key.startsWith('special:'));
  const handleSave = async ({ name, file, opening }) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.SpecialFrame.create({ name, image_url: file_url, opening, active: true });
    toast({ title: 'Çerçeve atama kataloğuna eklendi' });
  };
  const remove = async (id, name) => {
    if (!confirm(`"${name}" çerçevesi silinsin mi?`)) return;
    setBusy(id);
    try { await base44.entities.SpecialFrame.delete(id); await refreshFrames(); toast({ title: 'Çerçeve silindi' }); }
    catch (error) { toast({ title: 'Silinemedi', description: error.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };
  return <section className="mb-4 rounded-xl border border-border bg-card p-4">
    <h2 className="text-lg font-bold">Şeffaf PNG Çerçeve Aracı</h2>
    <p className="mb-4 text-sm text-muted-foreground">Telefonda dokunarak profil alanını seçin, ayrıntıları koruyarak şeffaf PNG hazırlayın.</p>
    <button onClick={() => setOpen(true)} className="min-h-14 w-full rounded-xl bg-primary px-4 text-base font-extrabold text-primary-foreground">＋ PNG Yükle ve Düzenle</button>
    {open && <MobileFrameEditor onClose={() => setOpen(false)} onSave={handleSave} saveLabel="Kataloğa Kaydet" />}
    {customFrames.length > 0 && <div className="mt-4 space-y-2">
      <h3 className="text-sm font-bold">Kayıtlı Çerçeveler ({customFrames.length})</h3>
      {customFrames.map(([key, frame]) => <div key={key} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-2">
        <img src={frame.image_url} alt={frame.label} className="h-12 w-12 shrink-0 object-contain" />
        <span className="flex-1 truncate text-sm font-semibold">{frame.label}</span>
        <button onClick={() => remove(key.replace('special:', ''), frame.label)} disabled={busy === key.replace('special:', '')} className="min-h-11 shrink-0 rounded-lg bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50">Sil</button>
      </div>)}
    </div>}
  </section>;
}