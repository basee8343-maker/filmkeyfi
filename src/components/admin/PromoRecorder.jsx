import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle, Play, Square, RotateCcw, Save, X } from 'lucide-react';

const MAX_DURATION = 60;
const FPS = 15;

// Önizleme iframe'i getDisplayMedia'yi engellediği için uygulamayı DOM'dan
// kare kare yakalayıp canvas'a çizer, canvas.captureStream + MediaRecorder ile
// webm üretir. Gerçek CSS/SVG animasyonları canlı kaydedilir.
export default function PromoRecorder({ onClose, onSaved }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState('idle'); // idle | recording | preview | uploading
  const [secondsLeft, setSecondsLeft] = useState(MAX_DURATION);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');

  const canvasRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const blobRef = useRef(null);
  const capturingRef = useRef(false);
  const pillRef = useRef(null);

  const stop = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  };

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }, []);

  const captureFrame = async () => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    try {
      const canvas = await html2canvas(document.body, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el === pillRef.current,
      });
      const c = canvasRef.current;
      if (c.width !== canvas.width) c.width = canvas.width;
      if (c.height !== canvas.height) c.height = canvas.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
    } catch {
      /* kare atlanır */
    }
    capturingRef.current = false;
  };

  const start = async () => {
    setError('');
    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvasRef.current = canvas;

      const stream = canvas.captureStream(FPS);
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase('preview');
      };
      rec.start(200);

      setPhase('recording');
      setSecondsLeft(MAX_DURATION);
      // kare yakalama döngüsü
      intervalRef.current = setInterval(captureFrame, 1000 / FPS);
      // geri sayım
      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setSecondsLeft(MAX_DURATION - elapsed);
        if (elapsed >= MAX_DURATION) stop();
      }, 1000);
    } catch (e) {
      setError('Kayıt başlatılamadı: ' + (e.message || 'bilinmeyen hata'));
    }
  };

  const save = async () => {
    setPhase('uploading');
    setError('');
    try {
      const blob = blobRef.current;
      const file = new File([blob], `tanitim-${Date.now()}.webm`, { type: 'video/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.PromoVideo.create({
        title: title.trim() || `Tanıtım ${new Date().toLocaleDateString('tr-TR')}`,
        file_url,
        duration: MAX_DURATION,
        status: 'draft',
        width: canvasRef.current?.width || 0,
        height: canvasRef.current?.height || 0,
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
    <>
      <canvas ref={canvasRef} className="hidden" />

      {phase === 'idle' && (
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
            <p className="text-sm text-muted-foreground mb-4">"Kaydı Başlat"a bastığınızda uygulama canlı kaydedilmeye başlar. İstediğiniz sayfalarda gezinip oda, sohbet ve rol animasyonlarını gösterin — 60 saniye kaydedilir.</p>
            <div className="bg-secondary/60 rounded-lg p-3 text-xs text-muted-foreground space-y-1 mb-4">
              <p>• Kayıt sırasında üstte küçük bir sayaç görünür, istediğiniz an durdurabilirsiniz.</p>
              <p>• Animasyonlar gerçek zamanlı kare kare yakalanır.</p>
            </div>
            <button onClick={start} className={`w-full ${btn} bg-primary text-primary-foreground`}>
              <Play className="w-4 h-4" /> Kaydı Başlat
            </button>
          </div>
        </div>
      )}

      {phase === 'recording' && (
        <div ref={pillRef} className="fixed top-3 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 bg-black/85 border border-destructive/50 rounded-full pl-3 pr-1.5 py-1.5 shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
          <span className="text-white font-bold text-sm tabular-nums">{secondsLeft}s</span>
          <button onClick={stop} className="ml-1 px-2.5 py-1 rounded-full bg-destructive text-white text-xs font-semibold flex items-center gap-1">
            <Square className="w-3 h-3" /> Durdur
          </button>
        </div>
      )}

      {phase === 'preview' && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Önizleme</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
            </div>
            {error && (
              <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <video src={previewUrl} controls playsInline className="w-full rounded-lg max-h-72 bg-black mb-3" />
            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-1">Başlık</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tanıtım Videosu" className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" />
            </div>
            <div className="flex gap-2">
              <button onClick={retake} className={`flex-1 ${btn} bg-secondary`}><RotateCcw className="w-4 h-4" /> Yeniden</button>
              <button onClick={save} className={`flex-1 ${btn} bg-primary text-primary-foreground`}><Save className="w-4 h-4" /> Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'uploading' && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">Video yükleniyor...</p>
          </div>
        </div>
      )}
    </>
  );
}