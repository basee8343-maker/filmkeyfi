import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Plus, Landmark, CreditCard, Copy, Check, Key, Eye, EyeOff } from 'lucide-react';

const BANK_FIELDS = [
  { key: 'bank_name', label: 'Banka Adı' },
  { key: 'account_holder', label: 'Hesap Sahibi' },
  { key: 'iban', label: 'IBAN' },
  { key: 'branch', label: 'Şube' },
  { key: 'payment_instructions', label: 'Ödeme Talimatı' },
];

const CARD_FIELDS = [
  { key: 'merchant_id', label: 'Merchant ID' },
  { key: 'merchant_key', label: 'Merchant Key (Gizli)' },
  { key: 'merchant_salt', label: 'Merchant Salt (Gizli)' },
];

export default function PaymentMethodsManager() {
  const [methods, setMethods] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);

  const load = async () => {
    try {
      const [items, cfgs] = await Promise.all([
        base44.entities.PaymentMethod.list('sort_order', 50),
        base44.entities.PaymentProviderConfig.list('-updated_date', 50),
      ]);
      setMethods(items);
      setConfigs(cfgs);
    } catch {}
    setLoading(false);
  };
  useEffect(() => {
    load();
    const unsub1 = base44.entities.PaymentMethod.subscribe(() => load());
    const unsub2 = base44.entities.PaymentProviderConfig.subscribe(() => load());
    return () => { unsub1(); unsub2(); };
  }, []);

  const toggleEnabled = async (m) => {
    try {
      await base44.entities.PaymentMethod.update(m.id, { enabled: !m.enabled });
    } catch {}
  };

  const save = async (data, secretData) => {
    try {
      let saved;
      if (editing.id) {
        saved = await base44.entities.PaymentMethod.update(editing.id, data);
      } else {
        saved = await base44.entities.PaymentMethod.create(data);
      }
      if (secretData && secretData.provider_key) {
        const existing = configs.find((c) => c.provider_key === secretData.provider_key);
        if (existing) {
          await base44.entities.PaymentProviderConfig.update(existing.id, secretData);
        } else {
          await base44.entities.PaymentProviderConfig.create(secretData);
        }
      }
      setEditing(null);
      load();
    } catch {}
  };

  const copyText = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Ödeme Yöntemleri</h2>
        <button onClick={() => setEditing({ new: true })} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
          <Plus className="w-4 h-4" /> Yöntem Ekle
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {methods.map((m) => {
          const cfg = configs.find((c) => c.provider_key === m.provider_key);
          return (
            <div key={m.id} className="bg-[#16161e] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: m.type === 'bank_transfer' ? '#3b82f620' : '#7c3aed20' }}>
                  {m.type === 'bank_transfer' ? <Landmark className="w-5 h-5 text-blue-400" /> : <CreditCard className="w-5 h-5 text-purple-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{m.display_name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.provider_key}</p>
                </div>
                <ToggleSwitch checked={m.enabled} onChange={() => toggleEnabled(m)} />
              </div>

              {m.type === 'bank_transfer' && (
                <div className="space-y-1 text-xs">
                  {m.bank_name && <p className="text-gray-300"><b className="text-gray-400">Banka:</b> {m.bank_name}</p>}
                  {m.account_holder && <p className="text-gray-300"><b className="text-gray-400">Hesap Sahibi:</b> {m.account_holder}</p>}
                  {m.iban && (
                    <div className="flex items-center gap-2">
                      <p className="text-gray-300 font-mono flex-1 truncate"><b className="text-gray-400 font-sans">IBAN:</b> {m.iban}</p>
                      <button onClick={() => copyText(m.iban, m.id)} className="text-blue-400 shrink-0">{copied === m.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
                    </div>
                  )}
                  {!m.iban && <p className="text-amber-400 text-xs">⚠️ IBAN eksik — kullanıcıya gösterilmez</p>}
                </div>
              )}

              {m.type === 'card' && (
                <div className="space-y-1 text-xs">
                  {m.merchant_id && <p className="text-gray-300"><b className="text-gray-400">Merchant ID:</b> {m.merchant_id}</p>}
                  <div className="flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-amber-400" />
                    <span className={cfg?.merchant_key ? 'text-green-400' : 'text-red-400'}>{cfg?.merchant_key ? 'API anahtarları tanımlı' : 'API anahtarları eksik'}</span>
                  </div>
                  <p className="text-gray-400"><b className="text-gray-500">Mod:</b> {m.test_mode ? 'Test' : 'Canlı'}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className={`text-xs font-semibold ${m.enabled ? 'text-green-400' : 'text-red-400'}`}>{m.enabled ? 'Aktif' : 'Pasif'}</span>
                <button onClick={() => setEditing({ ...m, _config: cfg })} className="text-sm text-purple-400 font-semibold">Düzenle</button>
              </div>
            </div>
          );
        })}
      </div>

      {methods.length === 0 && <div className="bg-[#16161e] rounded-xl p-8 text-center text-gray-400">Henüz ödeme yöntemi eklenmedi.</div>}

      {editing && <MethodForm method={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange} className="w-11 h-6 rounded-full relative transition-colors shrink-0" style={{ background: checked ? '#22c55e' : '#ef4444' }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: `translateX(${checked ? 22 : 2}px)` }} />
    </button>
  );
}

function MethodForm({ method, onSave, onClose }) {
  const [providerKey, setProviderKey] = useState(method.provider_key || '');
  const [displayName, setDisplayName] = useState(method.display_name || '');
  const [type, setType] = useState(method.type || 'bank_transfer');
  const [enabled, setEnabled] = useState(method.enabled || false);
  const [sortOrder, setSortOrder] = useState(method.sort_order || 0);
  const [description, setDescription] = useState(method.description || '');
  const [bankName, setBankName] = useState(method.bank_name || '');
  const [accountHolder, setAccountHolder] = useState(method.account_holder || '');
  const [iban, setIban] = useState(method.iban || '');
  const [branch, setBranch] = useState(method.branch || '');
  const [paymentInstructions, setPaymentInstructions] = useState(method.payment_instructions || '');
  const [merchantId, setMerchantId] = useState(method.merchant_id || '');
  const [testMode, setTestMode] = useState(method.test_mode || false);
  const [merchantKey, setMerchantKey] = useState(method._config?.merchant_key || '');
  const [merchantSalt, setMerchantSalt] = useState(method._config?.merchant_salt || '');
  const [showKey, setShowKey] = useState(false);
  const [showSalt, setShowSalt] = useState(false);
  const [requiredFields, setRequiredFields] = useState(method.required_fields || []);
  const [saving, setSaving] = useState(false);

  const toggleRequired = (key) => {
    setRequiredFields((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { provider_key: providerKey, display_name: displayName, type, enabled, sort_order: Number(sortOrder), description, required_fields: requiredFields };
    if (type === 'bank_transfer') Object.assign(data, { bank_name: bankName, account_holder: accountHolder, iban, branch, payment_instructions: paymentInstructions });
    if (type === 'card') Object.assign(data, { merchant_id: merchantId, test_mode: testMode });
    const secretData = type === 'card' && (merchantKey || merchantSalt) ? { provider_key: providerKey, merchant_key: merchantKey, merchant_salt: merchantSalt, test_mode: testMode } : null;
    await onSave(data, secretData);
    setSaving(false);
  };

  const inputClass = "w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500";
  const labelClass = "text-xs text-gray-400 mb-1 block";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#16161e] border border-white/10 rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{method.id ? 'Yöntem Düzenle' : 'Yeni Ödeme Yöntemi'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Sağlayıcı Anahtarı</label><input value={providerKey} onChange={(e) => setProviderKey(e.target.value)} placeholder="bank_transfer, paytr" required className={inputClass} /></div>
            <div><label className={labelClass}>Görünen Ad</label><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Banka Transferi" required className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Tür</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
              <option value="bank_transfer">Banka Transferi</option>
              <option value="card">Kredi/Bank Kartı (Sanal POS)</option>
              <option value="other">Diğer</option>
            </select>
          </div>
          <div><label className={labelClass}>Açıklama</label><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></div>

          {type === 'bank_transfer' && (
            <div className="space-y-3 bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
              <p className="text-xs font-semibold text-blue-400">Banka Transferi Bilgileri</p>
              <div><label className={labelClass}>Banka Adı</label><input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Hesap Sahibi</label><input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>IBAN</label><input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TRXX XXXX XXXX XXXX XXXX XXXX XX" className={`${inputClass} font-mono`} /></div>
              <div><label className={labelClass}>Şube</label><input value={branch} onChange={(e) => setBranch(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Ödeme Talimatı</label><textarea value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} rows={2} placeholder="Açıklamaya kullanıcı adınızı yazın." className={inputClass} /></div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Zorunlu alanları seçin (eksikse yöntem kullanıcıya gösterilmez):</p>
                <div className="flex flex-wrap gap-2">
                  {BANK_FIELDS.map((f) => (
                    <button type="button" key={f.key} onClick={() => toggleRequired(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${requiredFields.includes(f.key) ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                      {requiredFields.includes(f.key) ? '✓ ' : ''}{f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'card' && (
            <div className="space-y-3 bg-purple-500/5 rounded-lg p-3 border border-purple-500/10">
              <p className="text-xs font-semibold text-purple-400">Sanal POS / API Anahtarları</p>
              <div><label className={labelClass}>Merchant ID</label><input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Merchant Key (Gizli)</label>
                <div className="relative">
                  <input type={showKey ? 'text' : 'password'} value={merchantKey} onChange={(e) => setMerchantKey(e.target.value)} placeholder="••••••••" className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Merchant Salt (Gizli)</label>
                <div className="relative">
                  <input type={showSalt ? 'text' : 'password'} value={merchantSalt} onChange={(e) => setMerchantSalt(e.target.value)} placeholder="••••••••" className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowSalt(!showSalt)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{showSalt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="w-4 h-4 accent-purple-500 shrink-0" /><span className="text-sm text-gray-300">Test Modu</span></label>
              <p className="text-xs text-amber-400 bg-amber-500/10 rounded-lg p-2">⚠️ Merchant Key ve Salt güvenli şekilde backend'de saklanır, kullanıcıya gösterilmez.</p>
              <div>
                <p className="text-xs text-gray-400 mb-2">Zorunlu alanları seçin (eksikse yöntem kullanıcıya gösterilmez):</p>
                <div className="flex flex-wrap gap-2">
                  {CARD_FIELDS.map((f) => (
                    <button type="button" key={f.key} onClick={() => toggleRequired(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${requiredFields.includes(f.key) ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                      {requiredFields.includes(f.key) ? '✓ ' : ''}{f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div><label className={labelClass}>Sıralama</label><input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 accent-purple-500 shrink-0" /><span className="text-sm text-gray-300">Aktif</span></label>
          <button type="submit" disabled={saving} className="w-full py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </form>
      </div>
    </div>
  );
}