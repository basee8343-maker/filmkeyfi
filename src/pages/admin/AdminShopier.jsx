import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Save, Check, Copy, CreditCard } from 'lucide-react';

const WEBHOOK_URL = 'https://flimkeyfii.base44.app/functions/shopier-webhook';

export default function AdminShopier() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState({});
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const configs = await base44.entities.AppConfig.list(100).catch(() => []);
    const get = (k, f = '') => configs.find((c) => c.key === k)?.value ?? f;
    setCfg({
      shopier_api_key: get('shopier_api_key'),
      shopier_secret: get('shopier_secret'),
      shopier_website_index: get('shopier_website_index', '1'),
      shopier_mode: get('shopier_mode', 'live'),
      shopier_webhook_url: get('shopier_webhook_url', WEBHOOK_URL),
      shopier_webhook_token: get('shopier_webhook_token'),
      shopier_success_url: get('shopier_success_url', '/odeme/basarili'),
      shopier_fail_url: get('shopier_fail_url', '/odeme/basarisiz'),
    });
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const configs = await base44.entities.AppConfig.list(100).catch(() => []);
      for (const [k, v] of Object.entries(cfg)) {
        const existing = configs.find((c) => c.key === k);
        if (existing) await base44.entities.AppConfig.update(existing.id, { value: String(v ?? '') });
        else await base44.entities.AppConfig.create({ key: k, value: String(v ?? '') });
      }
      toast({ title: 'Shopier ayarları kaydedildi' });
    } catch { toast({ title: 'Hata', variant: 'destructive' }); }
    setSaving(false);
  };

  const copyWebhook = () => { navigator.clipboard.writeText(cfg.shopier_webhook_url || WEBHOOK_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); toast({ title: 'Webhook URL kopyalandı' }); };

  const field = 'w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring border border-border';
  const label = 'block text-xs font-semibold text-muted-foreground mb-1.5';

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Shopier Ayarları</h1>
      <p className="text-sm text-muted-foreground mb-6">Ödeme entegrasyonu — sadece Shopier</p>

      <form onSubmit={save} className="max-w-xl bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <label className={label}>Shopier API Anahtarı</label>
          <div className="relative">
            <input type={showKey ? 'text' : 'password'} className={field + ' pr-10'} placeholder="API anahtarı" value={cfg.shopier_api_key || ''} onChange={(e) => setCfg({ ...cfg, shopier_api_key: e.target.value })} />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
        </div>

        <div>
          <label className={label}>Shopier Gizli Anahtar (Secret)</label>
          <div className="relative">
            <input type={showSecret ? 'text' : 'password'} className={field + ' pr-10'} placeholder="Gizli anahtar" value={cfg.shopier_secret || ''} onChange={(e) => setCfg({ ...cfg, shopier_secret: e.target.value })} />
            <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Website Index</label>
            <input className={field} value={cfg.shopier_website_index || '1'} onChange={(e) => setCfg({ ...cfg, shopier_website_index: e.target.value })} />
          </div>
          <div>
            <label className={label}>Mod</label>
            <select className={field} value={cfg.shopier_mode || 'live'} onChange={(e) => setCfg({ ...cfg, shopier_mode: e.target.value })}>
              <option value="live">Canlı</option>
              <option value="test">Test</option>
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Entegrasyon Durumu</label>
          <div className="flex items-center gap-2 text-sm">
            {cfg.shopier_api_key && cfg.shopier_secret
              ? <><span className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="font-semibold text-green-500">Aktif</span></>
              : <><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="font-semibold text-amber-500">Yapılandırılmadı</span></>}
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="font-bold text-sm mb-4">Webhook Ayarları</h3>

          <div className="space-y-4">
            <div>
              <label className={label}>Webhook / Ödeme Bildirim Adresi</label>
              <div className="flex items-center gap-2">
                <input className={field + ' font-mono text-xs'} value={cfg.shopier_webhook_url || ''} onChange={(e) => setCfg({ ...cfg, shopier_webhook_url: e.target.value })} placeholder={WEBHOOK_URL} />
                <button type="button" onClick={copyWebhook} className="p-2.5 rounded-lg bg-secondary shrink-0" title="Kopyala">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Bu adresi Shopier panelindeki bildirim URL'sine yapıştırın. Varsayılan: {WEBHOOK_URL}</p>
            </div>

            <div>
              <label className={label}>Webhook Doğrulama Token'ı</label>
              <input type={showToken ? 'text' : 'password'} className={field} placeholder="Webhook imza token" value={cfg.shopier_webhook_token || ''} onChange={(e) => setCfg({ ...cfg, shopier_webhook_token: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Shopier webhook aboneliği oluşturunca dönen token. İmza doğrulaması (HMAC-SHA256) için zorunludur.</p>
            </div>
          </div>
        </div>

        <div>
          <label className={label}>Başarılı Ödeme Yönlendirme Adresi</label>
          <input className={field} value={cfg.shopier_success_url || ''} onChange={(e) => setCfg({ ...cfg, shopier_success_url: e.target.value })} placeholder="/odeme/basarili" />
        </div>

        <div>
          <label className={label}>Başarısız Ödeme Yönlendirme Adresi</label>
          <input className={field} value={cfg.shopier_fail_url || ''} onChange={(e) => setCfg({ ...cfg, shopier_fail_url: e.target.value })} placeholder="/odeme/basarisiz" />
        </div>

        <button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor...' : 'KAYDET'}
        </button>
      </form>

      <div className="max-w-xl mt-6 bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2"><CreditCard className="w-5 h-5 text-primary" /><h3 className="font-bold">Abonelik Ürünleri</h3></div>
        <p className="text-sm text-muted-foreground">Abonelik paketlerini ve Shopier ödeme linklerini <span className="text-primary font-semibold">Abonelik Ürünleri</span> bölümünden yönetin. Her ürün için fiyat, süre ve Shopier ödeme linki tanımlayabilirsiniz.</p>
      </div>
    </div>
  );
}