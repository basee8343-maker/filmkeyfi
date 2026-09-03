import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import PromoRecorder from '@/components/admin/PromoRecorder';
import { Plus, Trash2, Download, Eye, EyeOff, Loader2, Video, CheckCircle2 } from 'lucide-react';

export default function AdminPromoVideo() {
  const { toast } = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.PromoVideo.list('-created_date', 50);
      setVideos(list);
    } catch {
      toast({ title: 'Liste yüklenemedi', variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const unsub = base44.entities.PromoVideo.subscribe(() => load());
    return unsub;
  }, [load]);

  const publish = async (v) => {
    setBusyId(v.id);
    try {
      const others = videos.filter((x) => x.id !== v.id && x.status === 'published');
      if (others.length) await base44.entities.PromoVideo.bulkUpdate(others.map((o) => ({ id: o.id, status: 'draft' })));
      await base44.entities.PromoVideo.update(v.id, { status: 'published' });
      toast({ title: 'Yayınlandı', description: 'Giriş ekranı tanıtım videosu güncellendi' });
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e.message, variant: 'destructive' });
    }
    setBusyId(null);
  };

  const unpublish = async (v) => {
    setBusyId(v.id);
    try {
      await base44.entities.PromoVideo.update(v.id, { status: 'draft' });
      toast({ title: 'Yayından kaldırıldı' });
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e.message, variant: 'destructive' });
    }
    setBusyId(null);
  };

  const remove = async (v) => {
    if (!confirm('Bu tanıtım videosu kalıcı olarak silinsin mi?')) return;
    setBusyId(v.id);
    try {
      await base44.entities.PromoVideo.delete(v.id);
      toast({ title: 'Silindi' });
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e.message, variant: 'destructive' });
    }
    setBusyId(null);
  };

  const fmtSize = (b) => {
    if (!b) return '-';
    if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB';
    return (b / 1e3).toFixed(0) + ' KB';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Tanıtım Videosu</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerçek ekran kaydıyla 60 sn tanıtım oluşturun. Yayınlanan video giriş ekranında görünür.</p>
        </div>
        <button onClick={() => setRecording(true)} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Kayıt
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
      ) : videos.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Henüz tanıtım videosu yok.</p>
          <p className="text-sm mt-1">"Yeni Kayıt" ile ilk videonuzu oluşturun.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <div key={v.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="relative bg-black aspect-[9/16] max-h-72">
                <video src={v.file_url} controls playsInline className="w-full h-full object-contain" />
                {v.status === 'published' && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-green-500/90 text-white text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> YAYINDA
                  </span>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <div>
                  <p className="font-semibold text-sm truncate">{v.title}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(v.created_date).toLocaleString('tr-TR')} · {fmtSize(v.size_bytes)}</p>
                </div>
                <div className="flex gap-1.5 mt-auto">
                  {v.status === 'published' ? (
                    <button onClick={() => unpublish(v)} disabled={busyId === v.id} className="flex-1 px-2 py-2 rounded-lg bg-secondary text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                      <EyeOff className="w-3.5 h-3.5" /> Kaldır
                    </button>
                  ) : (
                    <button onClick={() => publish(v)} disabled={busyId === v.id} className="flex-1 px-2 py-2 rounded-lg bg-green-500/20 text-green-500 text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                      <Eye className="w-3.5 h-3.5" /> Yayınla
                    </button>
                  )}
                  <a href={v.file_url} download className="px-2 py-2 rounded-lg bg-secondary text-xs font-semibold flex items-center justify-center" title="İndir">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => remove(v)} disabled={busyId === v.id} className="px-2 py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold flex items-center justify-center disabled:opacity-50" title="Sil">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {recording && <PromoRecorder onClose={() => setRecording(false)} onSaved={() => setRecording(false)} />}
    </div>
  );
}