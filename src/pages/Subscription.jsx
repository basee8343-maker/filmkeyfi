import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { CreditCard, Loader2, Check, Shield } from 'lucide-react';

export default function Subscription() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('shopier-payment', {});
      const { endpoint, args } = res.data || res;
      if (!endpoint || !args) throw new Error('Ödeme başlatılamadı');
      // Shopier'e POST formu ile yönlendir
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = endpoint;
      for (const [k, v] of Object.entries(args)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = String(v);
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Ödeme başlatılamadı');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold mb-1"><span className="text-gradient">FILM</span>KEYFİ</h1>
          <p className="text-sm text-muted-foreground">Premium Abonelik</p>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden neon-glow">
          <div className="bg-gradient-to-r from-primary to-accent p-6 text-center">
            <p className="text-white/80 text-sm font-medium mb-1">1 Aylık Abonelik</p>
            <p className="text-5xl font-extrabold text-white">50 ₺</p>
            <p className="text-white/70 text-sm mt-1">30 gün boyunca</p>
          </div>
          <div className="p-6">
            <ul className="space-y-3 mb-6">
              {['Tüm filmlere ve dizilere sınırsız erişim', 'Watch Party ile birlikte izleme', 'Sesli sohbet odaları', 'Mobil ve masaüstü uyumlu', 'Reklamsız deneyim'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-green-500" /></span>
                  {f}
                </li>
              ))}
            </ul>

            {error && <p className="text-sm text-destructive mb-3 text-center">{error}</p>}

            <button onClick={pay} disabled={loading} className="w-full bg-primary text-primary-foreground py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Yönlendiriliyor...</> : <><CreditCard className="w-5 h-5" /> Abone Ol ve Öde</>}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Güvenli ödeme Shopier tarafından sağlanır
            </p>
          </div>
        </div>

        <button onClick={() => navigate('/')} className="w-full mt-4 text-sm text-muted-foreground py-2">Ana Sayfaya Dön</button>
      </div>
    </div>
  );
}