import { useState } from 'react';
import MobileFrameEditor from '@/components/admin/frame-editor/MobileFrameEditor';

export default function FrameUploadStudio() {
  const [open, setOpen] = useState(false);
  return <section className="mb-4 rounded-xl border border-border bg-card p-4"><h2 className="text-lg font-bold">Şeffaf PNG Çerçeve Aracı</h2><p className="mb-4 text-sm text-muted-foreground">Telefonda dokunarak profil alanını seçin, ayrıntıları koruyarak şeffaf PNG hazırlayın.</p><button onClick={() => setOpen(true)} className="min-h-14 w-full rounded-xl bg-primary px-4 text-base font-extrabold text-primary-foreground">＋ PNG Yükle ve Düzenle</button>{open && <MobileFrameEditor onClose={() => setOpen(false)} />}</section>;
}