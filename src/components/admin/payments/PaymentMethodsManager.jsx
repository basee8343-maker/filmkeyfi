import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Plus, Landmark, CreditCard, Copy, Check } from 'lucide-react';

export default function PaymentMethodsManager() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const items = await base44.entities.PaymentMethod.list('sort_order', 50);
      setMethods(items);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleEnabled = async (m) => {
    try {
      await base44.entities.PaymentMethod.update(m.id, { enabled: !m.enabled });
      setMethods((prev) => prev.map((x) => (x.id === m.id ? { ...x, enabled: !x.enabled } : x)));
    } catch {}
  };

  const save = async (data) => {
    try {
      if (editing.id) {
        await base44.entities.PaymentMethod.update(editing.id, data);
      } else {
        await base44.entities.PaymentMethod.create(data);
      }
      setEditing(null);
      load();
    } catch {}
  };

  const copyIban = (iban) => { navigator.clipboard?.writeText(iban); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Ödeme Yöntemleri</h2>
        <button onClick={() => setEditing({ new: true })} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
          <Plus className="w-4 h-4" /> Yöntem Ekle
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {methods.map((m) => (
          <div key={m.id} className="bg-[#16161e] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: m.type === 'bank_transfer' ? '#3b82f620' : '#7c3aed20' }}>
                {m.type === 'bank_transfer' ? <Landmark className="w-5 h-5 text-blue-400" /> : <CreditCard className="w-5 h-5 text-purple-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{m.display_name}</p>
                <p className="text-xs text-gray-400">{m.provider_key}</p>
              </div>
              <button onClick={() => toggleEnabled(m)} className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${m.enabled ? 'bg-green-500' : 'bg-red-500'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${m.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {m.type === 'bank_transfer' && (
              <div className="space-y-1 text-xs">
                {m.bank_name && <p className="text-gray-300"><b className="text-gray-400">Banka:</b> {m.bank_name}</p>}
                {m.account_holder && <p className="text-gray-300"><b className="text-gray-400">Hesap Sahibi:</b> {m.account_holder}</p>}
                {m.iban && (
                  <div className="flex items-center gap-2">
                    <p className="text-gray-300 font-mono flex-1 truncate"><b className="text-gray-400 non-mono">IBAN:</b> {m.iban}</p>
                    <button onClick={() => copyIban(m.iban)} className="text-blue-400 shrink-0">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
                  </div>
                )}
                {!m.iban && <p className="text-amber-400 text-xs">⚠️ IBAN bilgileri eksik — kullanıcıya gösterilmez</p>}
              </div>
            )}

            {m.type === 'card' && (
              <div className="text-xs text-gray-300">
                {m.merchant_id && <p><b className="text-gray-400">Merchant ID:</b> {m.merchant_id}</p>}
                <p className="mt-1"><b className="text-gray-400">Mod:</b> {m.test_mode ? 'Test' : 'Canlı'}</p>
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <span className={`text-xs font-semibold ${m.enabled ? 'text-green-400' : 'text-red-400'}`}>{m.enabled ? 'Aktif' : 'Pasif'}</span>
              <button onClick={() => setEditing(m)} className="text-sm text-purple-400 font-semibold">Düzenle</button>
            </div>
          </div>
        ))}
      </div>

      {methods.length === 0 && <div className="bg-[#16161e] rounded-xl p-8 text-center text-gray-400">Henüz ödeme yöntemi eklenmedi.</div>}

      {editing && <MethodForm method={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function MethodForm({ method, onSave, onClose }) {
  const isBank = method.type === 'bank_transfer' || method.new;
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

  const submit = (e) => {
    e.preventDefault();
    const data = { provider_key: providerKey, display_name: displayName, type, enabled, sort_order: Number(sortOrder), description };
    if (type === 'bank_transfer') Object.assign(data, { bank_name: bankName, account_holder: accountHolder, iban, branch, payment_instructions });
    if (type === 'card') Object.assign(data, { merchant_id: merchantId, test_mode: testMode });
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#16161e] border border-white/10 rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{method.id ? 'Yöntem Düzenle' : 'Yeni Ödeme Yöntemi'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Sağlayıcı Anahtarı</label><input value={providerKey} onChange={(e) => setProviderKey(e.target.value)} placeholder="bank_transfer, paytr" required className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500" /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Görünen Ad</label><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Banka Transferi" required className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500" /></div>
          </div>
          <div><label className="text-xs text-gray-400 mb-1 block">Tür</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5">
              <option value="bank_transfer">Banka Transferi</option>
              <option value="card">Kredi/Bank Kartı</option>
              <option value="other">Diğer</option>
            </select>
          </div>
          <div><label className="text-xs text-gray-400 mb-1 block">Açıklama</label><input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5" /></div>

          {type === 'bank_transfer' && (
            <>
              <div><label className="text-xs text-gray-400 mb-1 block">Banka Adı</label><input value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Hesap Sahibi</label><input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">IBAN</label><input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TRXX XXXX XXXX XXXX XXXX XXXX XX" className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white font-mono outline-none border border-white/5" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Şube</label><input value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Ödeme Talimatı</label><textarea value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} rows={2} placeholder="Açıklamaya kullanıcı adınızı yazın." className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5" /></div>
            </>
          )}

          {type === 'card' && (
            <>
              <div><label className="text-xs text-gray-400 mb-1 block">Merchant ID</label><input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="w-4 h-4 accent-purple-500" /><span className="text-sm text-gray-300">Test Modu</span></label>
              <p className="text-xs text-amber-400 bg-amber-500/10 rounded-lg p-2">⚠️ Gizli API anahtarları (Merchant Key, Salt) backend üzerinden güvenli şekilde saklanır. Entegrasyon için backend ayarları gerekir.</p>
            </>
          )}

          <div><label className="text-xs text-gray-400 mb-1 block">Sıralama</label><input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 accent-purple-500" /><span className="text-sm text-gray-300">Aktif</span></label>
          <button type="submit" className="w-full py-3 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>Kaydet</button>
        </form>
      </div>
    </div>
  );
}