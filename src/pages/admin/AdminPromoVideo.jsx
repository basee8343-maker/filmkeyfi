import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import PromoPlaylist from '@/components/PromoPlaylist';
import { Plus, Trash2, Download, Eye, EyeOff, Loader2, Video, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

// Sunucu tarafı tanıtım videosu üretim senaryoları (Veo promptları).
const SCENES = [
  {
    label: 'Sahne 1: Keşfet',
    prompt: 'Cinematic vertical 9:16 shot of a premium dark-themed movie streaming app on a smartphone, scrolling through a glossy grid of movie posters with red and purple neon accents, smooth scrolling motion, modern UI, dramatic cinematic lighting, high quality, 4k',
  },
  {
    label: 'Sahne 2: Oda & Sohbet',
    prompt: 'Cinematic 9:16 shot of a watch party room interface on a phone, multiple user avatars joining with glowing neon entrance animations, animated chat bubbles popping up, role badges with flame and lightning effects, premium dark UI, smooth transitions, high quality',
  },
  {
    label: 'Sahne 3: Film & Canlı Sohbet',
    prompt: 'Cinematic 9:16 shot of a movie playing on a phone screen with a live chat overlay, users reacting with emoji animations, microphone icons glowing, cinematic film footage in background, premium streaming app UI, smooth motion, high quality',
  },
];

const buildClips = async (onScene) => {
  const urls = [];
  for (let i = 0; i < SCENES.length; i++) {
    onScene?.(SCENES[i].label, i);
    const res = await base44.functions.invoke('generate-promo-clip', {
      scene_prompt: SCENES[i].prompt,
      aspect_ratio: '9:16',
    });
    if (!res?.data?.url) throw new Error('Beklenen video URL dönmedi');
    urls.push(res.data.url);
  }
  return urls;
};

export default function AdminPromoVideo() {
  const { toast } = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sceneLabel, setSceneLabel] = useState('');
  const [genError, setGenError] = useState('');
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

  const generate = async () => {
    setGenerating(true);
    setGenError('');
    setProgress(0);
    try {
      const urls = await buildClips((label, i) => {
        setSceneLabel(label);
        setProgress(Math.round((i / SCENES.length) * 100));
      });
      setProgress(100);
      await base44.entities.PromoVideo.create({
        title: `Tanıtım ${new Date().toLocaleString('tr-TR')}`,
        clips: urls,
        file_url: urls[0],
        duration: SCENES.length * 8,
        status: 'draft',
      });
      toast({ title: '✅ Tanıtım videosu hazır', description: `${SCENES.length} sahne üretildi` });
    } catch (e) {
      setGenError(e?.response?.data?.error || e?.message || 'Video oluşturulamadı');
    } finally {
      setGenerating(false);
      setSceneLabel('');
    }
  };

  const regenerate = async (v) => {
    setBusyId(v.id);
    try {
      const urls = await buildClips();
      await base44.entities.PromoVideo.update(v.id, { clips: urls, file_url: urls[0], duration: SCENES.length * 8 });
      toast({ title: 'Yeniden oluşturuldu' });
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e?.response?.data?.error || e?.message, variant: 'destructive' });
    }
    setBusyId(null);
  };

  const publish = async (v) => {
    setBusyId(v.id);
    try {
      const others = videos.filter((x) => x.id !== v.id && x.status === 'published');
      if (others.length) await base44.entities.PromoVideo.bulkUpdate(others.map((o) => ({ id: o.id, status: 'draft' })));
      await base44.entities.PromoVideo.update(v.id, { status: 'published' });
      toast({ title: '📢 Yayınlandı', description: 'Giriş ekranı tanıtım videosu güncellendi' });
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e?.message, variant: 'destructive' });
    }
    setBusyId(null);
  };

  const unpublish = async (v) => {
    setBusyId(v.id);
    try {
      await base44.entities.PromoVideo.update(v.id, { status: 'draft' });
      toast({ title: 'Yayından kaldırıldı' });
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e?.message, variant: 'destructive' });
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
      toast({ title: 'İşlem başarısız', description: e?.message, variant: 'destructive' });
    }
    setBusyId(null);
  };

  const clipsOf = (v) => (v.clips?.length ? v.clips : v.file_url ? [v.file_url] : []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Tanıtım Videosu</h1>
          <p className="text-sm text-muted-foreground mt-1">Sunucuda yapay zekâ ile profesyonel tanıtım videosu üretilir. Tarayıcı kaydı yoktur.</p>
        </div>
        <button onClick={generate} disabled={generating} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tanıtım Videosu Oluştur
        </button>
      </div>

      {generating && (
        <div className="mb-6 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Video hazırlanıyor…</span>
            <span className="text-sm font-bold tabular-nums text-primary">%{progress}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{sceneLabel || 'Başlatılıyor…'} — sunucuda render ediliyor, lütfen bekleyin.</p>
        </div>
      )}

      {genError && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Tanıtım videosu oluşturulamadı</p>
            <p className="text-xs mt-1 opacity-90">{genError}</p>
            <button onClick={generate} className="mt-3 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold">Tekrar Dene</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
      ) : videos.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Henüz tanıtım videosu yok.</p>
          <p className="text-sm mt-1">"Tanıtım Videosu Oluştur" ile ilk videonuzu üretin.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => {
            const clips = clipsOf(v);
            return (
              <div key={v.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                <div className="relative bg-black aspect-[9/16] max-h-80">
                  <PromoPlaylist clips={clips} controls className="w-full h-full object-contain" />
                  {v.status === 'published' && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-green-500/90 text-white text-[10px] font-bold flex items-center gap-1 z-10">
                      <CheckCircle2 className="w-3 h-3" /> YAYINDA
                    </span>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <div>
                    <p className="font-semibold text-sm truncate">{v.title}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(v.created_date).toLocaleString('tr-TR')} · {clips.length} sahne · {v.duration || clips.length * 8}sn</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {v.status === 'published' ? (
                      <button onClick={() => unpublish(v)} disabled={busyId === v.id} className="flex-1 min-w-[80px] px-2 py-2 rounded-lg bg-secondary text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                        <EyeOff className="w-3.5 h-3.5" /> Kaldır
                      </button>
                    ) : (
                      <button onClick={() => publish(v)} disabled={busyId === v.id} className="flex-1 min-w-[80px] px-2 py-2 rounded-lg bg-green-500/20 text-green-500 text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                        <Eye className="w-3.5 h-3.5" /> Yayınla
                      </button>
                    )}
                    <button onClick={() => regenerate(v)} disabled={busyId === v.id} className="px-2 py-2 rounded-lg bg-secondary text-xs font-semibold flex items-center justify-center disabled:opacity-50" title="Yeniden Oluştur">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <a href={clips[0]} download className="px-2 py-2 rounded-lg bg-secondary text-xs font-semibold flex items-center justify-center" title="İndir">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => remove(v)} disabled={busyId === v.id} className="px-2 py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold flex items-center justify-center disabled:opacity-50" title="Sil">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}