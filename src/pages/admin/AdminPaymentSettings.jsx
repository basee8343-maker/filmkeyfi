import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import ProviderForm from '@/components/admin/payment/ProviderForm';
import GeneralSettingsTab from '@/components/admin/payment/GeneralSettingsTab';
import CurrencySettingsTab from '@/components/admin/payment/CurrencySettingsTab';
import TaxSettingsTab from '@/components/admin/payment/TaxSettingsTab';
import InvoiceSettingsTab from '@/components/admin/payment/InvoiceSettingsTab';
import RefundSettingsTab from '@/components/admin/payment/RefundSettingsTab';
import { Plus, Info, ShieldCheck, FileText, ExternalLink, Settings, LifeBuoy } from 'lucide-react';

const PROVIDERS = [
  { id: 'paytr', name: 'PayTR', logo: 'PT', color: 'from-blue-500 to-blue-600' },
  { id: 'iyzico', name: 'iyzico', logo: 'iy', color: 'from-purple-500 to-purple-600' },
  { id: 'troy', name: 'Troy', logo: 'TR', color: 'from-red-500 to-red-600' },
  { id: 'stripe', name: 'Stripe', logo: 'S', color: 'from-indigo-500 to-indigo-600' },
  { id: 'paypal', name: 'PayPal', logo: 'PP', color: 'from-blue-400 to-blue-500' },
  { id: 'garanti', name: 'Garanti BBVA', logo: 'GB', color: 'from-green-600 to-green-700' },
  { id: 'akbank', name: 'Akbank', logo: 'AK', color: 'from-red-500 to-red-600' },
  { id: 'yapikredi', name: 'Yapı Kredi', logo: 'YK', color: 'from-green-500 to-green-600' },
  { id: 'isbank', name: 'İş Bankası', logo: 'İB', color: 'from-blue-600 to-blue-700' },
  { id: 'ziraat', name: 'Ziraat Bankası', logo: 'ZB', color: 'from-yellow-500 to-yellow-600' },
  { id: 'vakifbank', name: 'VakıfBank', logo: 'VB', color: 'from-yellow-600 to-yellow-700' },
  { id: 'shopier', name: 'Shopier', logo: 'SH', color: 'from-pink-500 to-pink-600' },
  { id: 'other', name: 'Diğer / Özel Sanal POS', logo: '++', color: 'from-gray-500 to-gray-600' },
];

const TABS = ['Genel Ayarlar', 'Sanal POS Ayarları', 'Para Birimleri', 'Vergi Ayarları', 'Fatura Ayarları', 'İade Ayarları'];
const SECURITY_TIPS = ['Gizli anahtarlarınızı kimseyle paylaşmayın', 'Test modunda gerçek ödeme alınmaz', '3D Secure kullanımını zorunlu kılın', 'Webhook URL\'nizi HTTPS üzerinden sunun', 'Düzenli olarak API loglarını kontrol edin'];
const DOCS = ['PayTR Entegrasyon Kılavuzu', 'iyzico API Dokümantasyonu', 'Stripe Kurulum Rehberi', 'Güvenlik Best Practices'];

export default function AdminPaymentSettings() {
  const { toast } = useToast();
  const [tab, setTab] = useState('Sanal POS Ayarları');
  const [selected, setSelected] = useState('paytr');
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const all = await base44.entities.AppConfig.list(100).catch(() => []);
      const map = {};
      all.forEach((c) => { if (c.key.startsWith('payment_')) { try { map[c.key.replace('payment_', '')] = JSON.parse(c.value || '{}'); } catch { } } });
      setConfigs(map);
      setLoading(false);
    };
    load();
  }, []);

  const getProvider = (id) => PROVIDERS.find((p) => p.id === id);
  const getSettings = (id) => configs[id] || { merchant_no: '', callback_url: '', merchant_pass: '', success_url: '', secret_key: '', fail_url: '', test_mode: false, secure_3d: 'required', installments: [1], active: false };

  const save = async (providerId, settings) => {
    try {
      const all = await base44.entities.AppConfig.list(100).catch(() => []);
      const key = `payment_${providerId}`;
      const existing = all.find((c) => c.key === key);
      if (existing) await base44.entities.AppConfig.update(existing.id, { value: JSON.stringify(settings) });
      else await base44.entities.AppConfig.create({ key, value: JSON.stringify(settings) });
      setConfigs((prev) => ({ ...prev, [providerId]: settings }));
      toast({ title: 'Ayarlar kaydedildi' });
    } catch { toast({ title: 'Hata', variant: 'destructive' }); }
  };

  const toggleActive = async (providerId) => {
    const s = getSettings(providerId);
    await save(providerId, { ...s, active: !s.active, updated: new Date().toLocaleDateString('tr-TR') });
  };

  const provider = getProvider(selected);
  const openNewProvider = () => { setSelected('other'); setTab('Sanal POS Ayarları'); };
  const renderSettingsTab = () => {
    const props = (key) => ({ value: configs[key] || {}, onSave: (data) => save(key, data) });
    if (tab === 'Genel Ayarlar') return <GeneralSettingsTab {...props('general')} />;
    if (tab === 'Para Birimleri') return <CurrencySettingsTab {...props('currencies')} />;
    if (tab === 'Vergi Ayarları') return <TaxSettingsTab {...props('tax')} />;
    if (tab === 'Fatura Ayarları') return <InvoiceSettingsTab {...props('invoice')} />;
    if (tab === 'İade Ayarları') return <RefundSettingsTab {...props('refund')} />;
    return null;
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Ödeme Ayarları</h1>
          <p className="text-sm text-muted-foreground mt-1">Sanal POS ayarlarını buradan yönetebilir ve düzenleyebilirsiniz.</p>
        </div>
        <button onClick={openNewProvider} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Yeni Ödeme Yöntemi Ekle
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab !== 'Sanal POS Ayarları' ? renderSettingsTab() : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Provider list */}
            <div className="lg:col-span-3 bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2 py-1.5">Ödeme Yöntemleri</p>
              <div className="space-y-0.5">
                {PROVIDERS.map((p) => {
                  const s = getSettings(p.id);
                  return (
                    <button key={p.id} onClick={() => setSelected(p.id)}
                      className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition-colors ${selected === p.id ? 'bg-primary/10 text-primary' : 'hover:bg-secondary'}`}>
                      <span className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg bg-gradient-to-br ${p.color} text-white text-[10px] font-bold flex items-center justify-center`}>{p.logo}</span>
                        {p.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.active ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>{s.active ? 'Aktif' : 'Pasif'}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={openNewProvider} className="w-full mt-2 flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-primary hover:bg-secondary border-t border-border pt-3">
                <Plus className="w-4 h-4" /> Yeni Ödeme Yöntemi Ekle
              </button>
            </div>

            {/* Middle: Provider form */}
            <div className="lg:col-span-6">
              <ProviderForm provider={provider} settings={getSettings(selected)} onSave={(s) => save(selected, s)} onCancel={() => {}} />
            </div>

            {/* Right: Info */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-12 h-12 text-primary" />
                </div>
                <h3 className="font-bold mb-1">Sanal POS Hakkında</h3>
                <p className="text-xs text-muted-foreground">Sanal POS entegrasyonları ile müşterilerinize güvenli ödeme imkanı sunun. 3D Secure ile işlemlerinizi koruyun.</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> Güvenlik Hatırlatmaları</h3>
                <ul className="space-y-2">
                  {SECURITY_TIPS.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Destek Dokümanları</h3>
                <ul className="space-y-2">
                  {DOCS.map((d, i) => (
                    <li key={i}>
                      <a href="#" className="flex items-center gap-2 text-xs text-primary hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> {d}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom: Provider cards */}
          <div>
            <h2 className="text-lg font-bold mb-3">Tüm Sanal POS Entegrasyonları</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {PROVIDERS.map((p) => {
                const s = getSettings(p.id);
                return (
                  <div key={p.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`w-10 h-10 rounded-lg bg-gradient-to-br ${p.color} text-white text-xs font-bold flex items-center justify-center`}>{p.logo}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.active ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>{s.active ? 'Aktif' : 'Pasif'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">Son Güncelleme: {s.updated || '—'}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => toggleActive(p.id)} className={`relative w-10 h-5 rounded-full transition-colors ${s.active ? 'bg-primary' : 'bg-secondary border border-border'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${s.active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <button onClick={() => setSelected(p.id)} className="text-xs px-2 py-1 rounded-lg border border-border hover:bg-secondary flex items-center gap-1">
                        <Settings className="w-3 h-3" /> Ayarlar
                      </button>
                    </div>
                  </div>
                );
              })}
              <button onClick={openNewProvider} className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary min-h-[140px]">
                <Plus className="w-6 h-6" />
                <span className="text-xs font-medium">Yeni Ödeme Yöntemi Ekle</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <LifeBuoy className="w-5 h-5 shrink-0" />
              <span>Ödeme entegrasyonları hakkında yardıma mı ihtiyacınız var? Destek ekibimiz size yardımcı olmaktan mutluluk duyacaktır.</span>
            </div>
            <button className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 shrink-0">Destek ile İletişime Geç</button>
          </div>
        </>
      )}
    </div>
  );
}