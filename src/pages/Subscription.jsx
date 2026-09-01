import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { CreditCard, Loader2, Check, Shield, Calendar } from 'lucide-react';

export default function Subscription() {
  const { user, loading: ul } = useCurrentUser();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.Package.filter({ active: true }, '-created_date', 50)
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buy = async (product) => {
    setPaying(product.id);
    setError('');
    try {
      const res = await base44.functions.invoke('shopier-payment', { product_id: product.id });
      const data = res.data || res;
      // Yöntem 1: Ödeme linki — doğrudan yönlendir
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      // Yöntem 2: API form — form oluştur ve submit et
      if (data.endpoint && data.args) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.endpoint;
        for (const [k, v] of Object.entries(data.args)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }
      throw new Error('Ödeme başlatılamadı');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Ödeme başlatılamadı');
      setPaying(null);
    }
  };

  if (ul || loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const isActive = membershipActive(user);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-1"><span className="text-gradient">FILM</span>KEYFİ</h1>
          <p className="text-sm text-muted-foreground">Abonelik Paketleri</p>
        </div>

        {isActive && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <p className="text-green-500 font-semibold flex items-center justify-center gap-2"><Check className="w-5 h-5" /> Aboneliğiniz Aktif</p>
            {user?.membership_end && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1"><Calendar className="w-3.5 h-3.5" /> Bitiş: {new Date(user.membership_end).toLocaleDateString('tr-TR')}</p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive mb-4 text-center">{error}</p>}

        {products.length === 0 ? (
          <p className="text-center text-muted-foreground">Henüz abonelik paketi bulunmuyor.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-primary to-accent p-5 text-center">
                  <p className="text-white/80 text-sm font-medium mb-1">{p.name}</p>
                  <p className="text-4xl font-extrabold text-white">{p.price} ₺</p>
                  <p className="text-white/70 text-sm mt-1">{p.duration_days || 30} gün</p>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  {p.description && <p className="text-sm text-muted-foreground mb-3">{p.description}</p>}
                  <ul className="space-y-2 mb-4 flex-1">
                    {(p.features || []).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-green-500" /></span>
                        {f}
                      </li>
                    ))}
                    {p.watch_party && <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> Watch Party</li>}
                    {p.voice_chat && <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> Sesli Sohbet</li>}
                  </ul>
                  <button onClick={() => buy(p)} disabled={paying === p.id} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    {paying === p.id ? <><Loader2 className="w-5 h-5 animate-spin" /> Yönlendiriliyor...</> : <><CreditCard className="w-5 h-5" /> Satın Al</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Güvenli ödeme Shopier tarafından sağlanır
          </p>
          <button onClick={() => navigate('/')} className="mt-4 text-sm text-muted-foreground py-2">Ana Sayfaya Dön</button>
        </div>
      </div>
    </div>
  );
}