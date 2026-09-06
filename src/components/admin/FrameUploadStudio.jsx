import { useState } from 'react';
import MobileFrameEditor from '@/components/admin/frame-editor/MobileFrameEditor';
import { useFrameCatalog } from '@/lib/FrameCatalogContext';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';

export default function FrameUploadStudio() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { frames, refreshFrames } = useFrameCatalog();
  const { toast } = useToast();
  const [busy, setBusy] = useState(null);
  const customFrames = Object.entries(frames).filter(([key]) => key.startsWith('special:'));
  const handleSave = async ({ name, file, opening, id }) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (id) {
      await base44.entities.SpecialFrame.update(id, { name, image_url: file_url, opening });
      toast({ title: 'Çerçeve güncellendi' });
    } else {
      await base44.entities.SpecialFrame.create({ name, image_url: file_url, opening, active: true });
      toast({ title: 'Çerçeve atama kataloğuna eklendi' });
    }
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
    <button onClick={() => { setEditing(null); setOpen(true); }} className="min-h-14 w-full rounded-xl bg-primary px-4 text-base font-extrabold text-primary-foreground">＋ PNG Yükle ve Düzenle</button>
    {open && <MobileFrameEditor onClose={() => { setOpen(false); setEditing(null); }} onSave={handleSave} saveLabel={editing ? 'Güncelle' : 'Kataloğa Kaydet'} existingFrame={editing} />}
    {customFrames.length > 0 && <div className="mt-4 space-y-2">
      <h3 className="text-sm font-bold">Kayıtlı Çerçeveler ({customFrames.length})</h3>
      {customFrames.map(([key, frame]) => <div key={key} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-2">
        <img src={frame.image_url} alt={frame.label} className="h-12 w-12 shrink-0 object-contain" />
        <span className="flex-1 truncate text-sm font-semibold">{frame.label}</span>
        <button onClick={() => { setEditing({ id: key.replace('special:', ''), name: frame.label, image_url: frame.image_url, opening: frame.opening }); setOpen(true); }} className="min-h-11 shrink-0 rounded-lg bg-secondary px-4 text-sm font-bold">Düzenle</button>
        <button onClick={() => remove(key.replace('special:', ''), frame.label)} disabled={busy === key.replace('special:', '')} className="min-h-11 shrink-0 rounded-lg bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50">Sil</button>
      </div>)}
    </div>}
  </section>;
}