import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Flag, X, Image as ImageIcon } from 'lucide-react';
import { Image } from '@/components/ui/image';

const REASONS = ['Spam', 'Taciz / Hakaret', 'Uygunsuz İçerik', 'Sahte Profil', 'Tehdit', 'Diğer'];

export default function ReportDialog({ targetId, targetName, context, contextId, onClose }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(f.type)) { toast({ title: 'Sadece JPG, PNG, WEBP', variant: 'destructive' }); e.target.value = ''; return; }
    if (f.size > 10 * 1024 * 1024) { toast({ title: 'Maksimum 10 MB', variant: 'destructive' }); e.target.value = ''; return; }
    setUploading(true);
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file: f }); setFileUrl(file_url); }
    catch { toast({ title: 'Yükleme hatası', variant: 'destructive' }); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const submit = async () => {
    if (!user || !targetId) return;
    setSending(true);
    try {
      await base44.entities.Report.create({
        reporter_id: user.id,
        reporter_name: user.username || user.full_name || 'Kullanıcı',
        target_id: targetId,
        target_name: targetName || '',
        context,
        context_id: contextId || '',
        reason: `${reason}${detail ? ' — ' + detail : ''}`,
        file_url: fileUrl || '',
      });
      toast({ title: 'Şikayetiniz alındı', description: 'İnceleyeceğiz.' });
      onClose();
    } catch { toast({ title: 'Gönderilemedi', variant: 'destructive' }); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><Flag className="w-5 h-5 text-destructive" /> Şikayet Et</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-3"><b>{targetName}</b> kullanıcısını şikayet ediyorsunuz</p>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm mb-2 outline-none">
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Açıklama (opsiyonel)" rows={2} className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:ring-2 focus:ring-ring" />
        <div className="mb-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
            <ImageIcon className="w-4 h-4" />
            {uploading ? 'Yükleniyor...' : fileUrl ? 'Fotoğraf eklendi ✓' : 'Fotoğraf ekle (opsiyonel)'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} disabled={uploading} />
          </label>
          {fileUrl && <div className="mt-2 relative"><Image src={fileUrl} alt="ek" className="w-full max-h-32 rounded-lg cursor-pointer" fittingType="fit" onClick={() => setLightbox(fileUrl)} /><button onClick={() => setFileUrl('')} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="w-3 h-3" /></button></div>}
        </div>
        <button onClick={submit} disabled={sending || uploading} className="w-full bg-destructive text-destructive-foreground py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">{sending ? 'Gönderiliyor...' : 'Şikayet Gönder'}</button>
      </div>
      {lightbox && <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4"><button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button><Image src={lightbox} className="max-w-full max-h-full rounded-lg" fittingType="fit" /></div>}
    </div>
  );
}