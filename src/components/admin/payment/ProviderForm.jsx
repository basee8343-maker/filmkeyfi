import { useState } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';

export default function ProviderForm({ provider, settings, onSave, onCancel }) {
  const [form, setForm] = useState(settings || {
    merchant_no: '', callback_url: '', merchant_pass: '', success_url: '', secret_key: '', fail_url: '',
    test_mode: false, secure_3d: 'required', installments: [1], active: false,
  });
  const [showPass, setShowPass] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const field = "w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring border border-border";
  const installments = [1, 2, 3, 6, 9, 12];

  const toggleInstallment = (i) => {
    setForm((f) => ({ ...f, installments: f.installments.includes(i) ? f.installments.filter((x) => x !== i) : [...f.installments, i] }));
  };

  const submit = (e) => { e.preventDefault(); onSave({ ...form, updated: new Date().toLocaleDateString('tr-TR') }); };

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{provider.name} Ayarları</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${form.active ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>{form.active ? 'Aktif' : 'Pasif'}</span>
      </div>
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>3D Secure ve taksit ayarlarını buradan yönetebilirsiniz. Değişiklikler kaydedildiğinde etkili olur.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium block mb-1">Mağaza No</label>
          <input className={field} value={form.merchant_no} onChange={(e) => setForm({ ...form, merchant_no: e.target.value })} placeholder="Mağaza numaranız" />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Bildirim (Callback) URL</label>
          <input className={field} value={form.callback_url} onChange={(e) => setForm({ ...form, callback_url: e.target.value })} placeholder="https://..." />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Mağaza Parolası</label>
          <div className="relative">
            <input className={field} type={showPass ? 'text' : 'password'} value={form.merchant_pass} onChange={(e) => setForm({ ...form, merchant_pass: e.target.value })} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Başarılı Ödeme URL</label>
          <input className={field} value={form.success_url} onChange={(e) => setForm({ ...form, success_url: e.target.value })} placeholder="https://..." />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Gizli Anahtar</label>
          <div className="relative">
            <input className={field} type={showKey ? 'text' : 'password'} value={form.secret_key} onChange={(e) => setForm({ ...form, secret_key: e.target.value })} placeholder="••••••••" />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Başarısız Ödeme URL</label>
          <input className={field} value={form.fail_url} onChange={(e) => setForm({ ...form, fail_url: e.target.value })} placeholder="https://..." />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <span className="text-sm font-medium">Test modunu aktifleştir</span>
          <button type="button" onClick={() => setForm({ ...form, test_mode: !form.test_mode })} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.test_mode ? 'bg-primary' : 'bg-secondary border border-border'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.test_mode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">3D Secure Zorunluluğu</label>
          <select className={field} value={form.secure_3d} onChange={(e) => setForm({ ...form, secure_3d: e.target.value })}>
            <option value="required">Zorunlu</option>
            <option value="optional">İsteğe Bağlı</option>
            <option value="none">Yok</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium block mb-2">Taksit Seçenekleri</label>
        <div className="flex flex-wrap gap-2">
          {installments.map((i) => (
            <button key={i} type="button" onClick={() => toggleInstallment(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.installments.includes(i) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
              {i === 1 ? 'Tek Çekim' : `${i} Taksit`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary">İptal</button>
        <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90">Kaydet</button>
      </div>
    </form>
  );
}