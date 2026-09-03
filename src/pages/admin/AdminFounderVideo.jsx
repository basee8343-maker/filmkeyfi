import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, RefreshCw, Video, CheckCircle2, AlertCircle, Flame } from 'lucide-react';

export default function AdminFounderVideo() {
  const { toast } = useToast();
  const [entryVideo, setEntryVideo] = useState('');
  const [exitVideo, setExitVideo] = useState('');
  const [loading, setLoading] = useState(true);
  const [genType, setGenType] = useState(null); // 'entry' | 'exit' | null
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('founder-video-manage', { action: 'get' });
      setEntryVideo(res?.data?.entry_video || '');
      setExitVideo(res?.data?.exit_video || '');
    } catch {
      toast({ title: 'Yüklenemedi', variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async (type) => {
    setGenType(type);
    setError('');
    try {
      const res = await base44.functions.invoke('founder-video-manage', { action: 'generate', type });
      if (res?.data?.url) {
        if (type === 'entry') setEntryVideo(res.data.url);
        else setExitVideo(res.data.url);
        toast({ title: '✅ Video üretildi', description: type === 'entry' ? 'Giriş videosu güncellendi' : 'Çıkış videosu güncellendi' });
      } else {
        throw new Error('URL alınamadı');
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Video oluşturulamadı');
    } finally {
      setGenType(null);
    }
  };

  const remove = async (type) => {
    if (!confirm(type === 'entry' ? 'Giriş videosu silinsin mi?' : 'Çıkış videosu silinsin mi?')) return;
    try {
      await base44.functions.invoke('founder-video-manage', { action: 'delete', type });
      if (type === 'entry') setEntryVideo('');
      else setExitVideo('');
      toast({ title: 'Silindi' });
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e?.message, variant: 'destructive' });
    }
  };

  const VideoCard = ({ type, url, title, desc }) => (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="relative bg-black aspect-video">
        {url ? (
          <video src={url} controls muted playsInline className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <Video className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-xs">Video yok</p>
          </div>
        )}
        {url && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-green-500/90 text-white text-[10px] font-bold flex items-center gap-1 z-10">
            <CheckCircle2 className="w-3 h-3" /> AKTİF
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <p className="font-bold text-sm flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /> {title}</p>
          <p className="text-xs text-muted-foreground mt-1">{desc}</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-auto">
          <button
            onClick={() => generate(type)}
            disabled={genType !== null}
            className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {genType === type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {url ? 'Yeniden Üret' : 'Üret'}
          </button>
          {url && (
            <button
              onClick={() => remove(type)}
              disabled={genType !== null}
              className="px-3 py-2 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Sil
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><Flame className="w-6 h-6 text-orange-500" /> Kurucu Video Ayarları</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kurucu rolündeki kullanıcılar odaya katıldığında/ayrıldığında oynatılacak gerçek AI videoları. Tüm oda üyeleri aynı anda görür.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Video oluşturulamadı</p>
            <p className="text-xs mt-1 opacity-90">{error}</p>
            <button onClick={() => setError('')} className="mt-2 text-xs underline">Kapat</button>
          </div>
        </div>
      )}

      {genType && (
        <div className="mb-6 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <div>
              <p className="font-semibold text-sm">AI video üretiliyor…</p>
              <p className="text-xs text-muted-foreground">{genType === 'entry' ? 'Giriş' : 'Çıkış'} videosu — bu işlem 30-60 saniye sürebilir.</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <VideoCard
            type="entry"
            url={entryVideo}
            title="Giriş Videosu"
            desc="Kurucu odaya katıldığında tüm üyelerde oynar. Yazı: 🔥 KURUCU ODAYA KATILDI 🔥"
          />
          <VideoCard
            type="exit"
            url={exitVideo}
            title="Çıkış Videosu"
            desc="Kurucu odadan ayrıldığında tüm üyelerde oynar. Yazı: 🔥 KURUCU ODADAN AYRILDI 🔥"
          />
        </div>
      )}
    </div>
  );
}