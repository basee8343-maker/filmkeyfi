import { useEffect, useState } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';
import DownloadGuide from '@/components/DownloadGuide';

export default function DownloadButtons({ variant = 'light' }) {
  const [prompt, setPrompt] = useState(null); const [guide, setGuide] = useState(null); const [installed, setInstalled] = useState(false);
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua); const android = /Android/.test(ua);
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
    const ready = (e) => { e.preventDefault(); setPrompt(e); }; const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', ready); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', done); };
  }, []);
  const install = async () => {
    if (prompt) { await prompt.prompt(); await prompt.userChoice; setPrompt(null); return; }
    setGuide(ios ? 'ios' : 'android');
  };
  const light = variant === 'light';
  if (installed) return <div className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${light ? 'bg-white/5 border-white/10 text-white' : 'bg-card border-border'}`}><Check className="w-4 h-4 text-green-500" /> Uygulama yüklü</div>;
  const label = ios ? 'Ana Ekrana Ekle' : android ? 'Hemen Yükle' : 'Uygulamayı Yükle';
  return <><button onClick={install} className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border font-semibold ${light ? 'bg-white/5 border-white/10 text-white' : 'bg-card border-border text-foreground'}`}>{ios ? <Smartphone className="w-5 h-5" /> : <Download className="w-5 h-5" />}{label}</button>{guide && <DownloadGuide platform={guide} variant={variant} onClose={() => setGuide(null)} />}</>;
}