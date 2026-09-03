import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle, Play, Square, RotateCcw, Save, X, ExternalLink } from 'lucide-react';

const MAX_DURATION = 60;

// Ekran kaydı stüdyosu: getDisplayMedia + MediaRecorder ile 60 sn canlı kayıt,
// ardından UploadFile ile yükleme. Gerçek site animasyonları kaydedilir.
export default function PromoRecorder({ onClose, onSaved }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState('idle'); // idle | recording | preview | uploading
  const [secondsLeft, setSecondsLeft] = useState(MAX_DURATION);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [needsNewTab, setNeedsNewTab] = useState(false);
  const [title, setTitle] = useState('');

  const chunksRef = useRef([]);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const blobRef = useRef(null);

  const stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state === 'recording') recorderRef.current.stop();
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    setError('');
    setNeedsNewTab(false);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase('preview');
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      stream.getVideoTracks()[0]?.addEventListener('ended', stop);
      rec.start(1000);
      setPhase('recording');
      setSecondsLeft(MAX_DURATION);
      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setSecondsLeft(MAX_DURATION - elapsed);
        if (elapsed >= MAX_DURATION) stop();
      }, 1000);
    } catch (e) {
      setNeedsNewTab(true);
      setError('Ekran kaydı bu pencerede çalışmıyor (önizleme engelli). Sayfayı yeni sekmede açın — tam pencerede kayıt çalışır.');
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener');
  };

  const save = async () => {
    setPhase('uploading');
    setError('');
    try {
      const blob = blobRef.current;
      const file = new File([blob], `tanitim-${Date.now()}.webm`, { type: 'video/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const track = streamRef.current?.getVideoTracks?.()[0];
      const settings = track?.getSettings?.() || {};
      await base44.entities.PromoVideo.create({
        title: title.trim() || `Tanıtım ${new Date().toLocaleDateString('tr-TR')}`,
        file_url,
        duration: MAX_DURATION,
        status: 'draft',
        width: settings.width || 0,
        height: settings.height || 0,
        size_bytes: blob.size,
      });
      toast({ title: 'Tanıtım videosu kaydedildi', description: 'Yayınlamak için listeyi kullanın.' });
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError('Yükleme başarısız: ' + (e.message || 'bilinmeyen hata'));
      setPhase('preview');
    }
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setPhase('idle');
    setSecondsLeft(MAX_DURATION);
  };

  const btn = 'px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50';

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">🎬 Tanıtım Videosu Kaydet</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {phase === 'idle' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">"Kaydı Başlat"a bastığınızda tarayıcı sizden paylaşılacak ekranı/sekmesi seçmenizi ister. Ardından sitede gezinip animasyonları gösterin — 60 saniye canlı kaydedilir.</p>
            <div className="bg-secondary/60 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>• Dikey mobil format için tarayıcı penceresini daraltın veya mobil önizleme kullanın.</p>
              <p>• Oda girişi, sohbet, rol animasyonları ve bildirimleri sergileyin.</p>
              <p>• Kaydı tarayıcının "Paylaşımı durdur" düğmesiyle de bitirebilirsiniz.</p>
            </div>
            {needsNewTab && (
              <button onClick={openInNewTab} className={`w-full ${btn} bg-accent text-accent-foreground`}>
                <ExternalLink className="w-4 h-4" /> Yeni Sekmede Aç
              </button>
            )}
            <button onClick={start} className={`w-full ${btn} bg-primary text-primary-foreground`}>
              <Play className="w-4 h-4" /> Kaydı Başlat
            </button>
          </div>
        )}

        {phase === 'recording' && (
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 text-destructive font-bold">
              <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" /> KAYIT
            </div>
            <div className="text-5xl font-extrabold tabular-nums">{secondsLeft}<span className="text-xl text-muted-foreground">sn</span></div>
            <p className="text-sm text-muted-foreground">Şimdi sitede gezin ve animasyonları gösterin. Süre dolduğunda kayıt otomatik durur.</p>
            <button onClick={stop} className={`w-full ${btn} bg-destructive text-destructive-foreground`}>
              <Square className="w-4 h-4" /> Kaydı Durdur
            </button>
          </div>
        )}

        {phase === 'preview' && (
          <div className="space-y-3">
            <video src={previewUrl} controls playsInline className="w-full rounded-lg max-h-72 bg-black" />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Başlık</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tanıtım Videosu" className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" />
            </div>
            <div className="flex gap-2">
              <button onClick={retake} className={`flex-1 ${btn} bg-secondary`}><RotateCcw className="w-4 h-4" /> Yeniden</button>
              <button onClick={save} className={`flex-1 ${btn} bg-primary text-primary-foreground`}><Save className="w-4 h-4" /> Kaydet</button>
            </div>
          </div>
        )}

        {phase === 'uploading' && (
          <div className="py-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">Video yükleniyor...</p>
          </div>
        )}
      </div>
    </div>
  );
}