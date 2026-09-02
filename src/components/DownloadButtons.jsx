import { useEffect, useState } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';
import DownloadGuide from '@/components/DownloadGuide';

export default function DownloadButtons({ variant = 'light' }) {
  const [prompt, setPrompt] = useState(null); const [guide, setGuide] = useState(null); const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
    const ready = (e) => { e.preventDefault(); setPrompt(e); }; const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', ready); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', done); };
  }, []);
  const install = async (platform) => {
    if (platform === 'android' && prompt) { await prompt.prompt(); await prompt.userChoice; setPrompt(null); return; }
    if (platform === 'ios') { if (navigator.share) await navigator.share({ title: 'FILMKEYFİ', url: window.location.href }); return; }
    setGuide('android');
  };
  const light = variant === 'light';
  if (installed) return <div className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${light ? 'bg-white/5 border-white/10 text-white' : 'bg-card border-border'}`}><Check className="w-4 h-4 text-green-500" /> Uygulama yüklü</div>;
  const buttonClass = `w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-semibold ${light ? 'bg-white/5 border-white/10 text-white' : 'bg-card border-border text-foreground'}`;
  return <><div className="grid sm:grid-cols-2 gap-3"><button onClick={() => install('android')} className={buttonClass}><Download className="w-5 h-5" /> Android — Hemen Yükle</button><button onClick={() => install('ios')} className={buttonClass}><Smartphone className="w-5 h-5" /> iOS — Ana Ekrana Ekle</button></div>{guide && <DownloadGuide platform={guide} variant={variant} onClose={() => setGuide(null)} />}</>;
}