import { useEffect, useState } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';

const common = [
  ['callback_url', 'Bildirim (Callback) URL', 'url'], ['success_url', 'Başarılı Ödeme URL', 'url'],
  ['fail_url', 'Başarısız Ödeme URL', 'url'],
];
const providerFields = {
  shopier: [['api_key', 'Shopier API Anahtarı'], ['api_secret', 'Shopier API Secret', 'password'], ['website_index', 'Website Index'], ...common],
  paytr: [['merchant_id', 'PayTR Mağaza No'], ['merchant_key', 'Mağaza Parolası', 'password'], ['merchant_salt', 'Gizli Anahtar (Salt)', 'password'], ...common],
  iyzico: [['api_key', 'iyzico API Anahtarı'], ['secret_key', 'iyzico Gizli Anahtarı', 'password'], ['base_url', 'API Sunucu Adresi', 'url'], ...common],
  stripe: [['publishable_key', 'Yayınlanabilir Anahtar'], ['secret_key', 'Gizli Anahtar', 'password'], ['webhook_secret', 'Webhook Signing Secret', 'password'], ...common],
  paypal: [['client_id', 'Client ID'], ['client_secret', 'Client Secret', 'password'], ['merchant_id', 'Merchant ID'], ...common],
  default: [['merchant_no', 'Üye İşyeri / Mağaza No'], ['terminal_id', 'Terminal No'], ['api_user', 'API Kullanıcısı'], ['merchant_pass', 'Mağaza Parolası', 'password'], ['secret_key', 'Gizli Anahtar', 'password'], ...common],
};

export default function ProviderForm({ provider, settings, onSave, onCancel }) {
  const [form, setForm] = useState(settings || {});
  const [visible, setVisible] = useState({});
  useEffect(() => setForm(settings || {}), [provider.id, settings]);
  const fields = providerFields[provider.id] || providerFields.default;
  const inputClass = 'w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring border border-border';
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = (e) => { e.preventDefault(); onSave({ ...form, updated: new Date().toLocaleDateString('tr-TR') }); };

  return <form onSubmit={submit} className="bg-card border border-border rounded-xl p-5 space-y-4">
    <div className="flex items-center justify-between"><h3 className="font-bold text-lg">{provider.name} Ayarları</h3><span className={`text-xs px-2 py-0.5 rounded-full ${form.active ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>{form.active ? 'Aktif' : 'Pasif'}</span></div>
    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs"><Info className="w-4 h-4 shrink-0" /><p>{provider.name} panelinizdeki entegrasyon bilgilerini eksiksiz girin. Gizli bilgiler yalnızca yöneticiler tarafından görüntülenir.</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{fields.map(([key, label, type = 'text']) => <div key={key}>
      <label className="text-xs font-medium block mb-1">{label}</label><div className="relative">
        <input className={inputClass} type={type === 'password' && !visible[key] ? 'password' : type === 'url' ? 'url' : 'text'} value={form[key] || ''} onChange={(e) => set(key, e.target.value)} placeholder={type === 'password' ? '••••••••' : type === 'url' ? 'https://...' : label} />
        {type === 'password' && <button type="button" onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">{visible[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
      </div></div>)}</div>
    <div className="grid sm:grid-cols-2 gap-3"><label className="flex items-center justify-between p-3 rounded-lg border border-border text-sm font-medium">Test modu<button type="button" onClick={() => set('test_mode', !form.test_mode)} className={`relative w-11 h-6 rounded-full ${form.test_mode ? 'bg-primary' : 'bg-secondary border border-border'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.test_mode ? 'translate-x-5' : ''}`} /></button></label><label className="text-xs font-medium">3D Secure<select className={`${inputClass} mt-1`} value={form.secure_3d || 'required'} onChange={(e) => set('secure_3d', e.target.value)}><option value="required">Zorunlu</option><option value="optional">İsteğe Bağlı</option><option value="none">Kapalı</option></select></label></div>
    <div><label className="text-xs font-medium block mb-2">Taksit Seçenekleri</label><div className="flex flex-wrap gap-2">{[1,2,3,6,9,12].map((i) => { const chosen = (form.installments || [1]).includes(i); return <button key={i} type="button" onClick={() => set('installments', chosen ? (form.installments || []).filter((x) => x !== i) : [...(form.installments || [1]), i])} className={`px-3 py-1.5 rounded-lg text-xs border ${chosen ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{i === 1 ? 'Tek Çekim' : `${i} Taksit`}</button>; })}</div></div>
    <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary">İptal</button><button className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground">Kaydet</button></div>
  </form>;
}