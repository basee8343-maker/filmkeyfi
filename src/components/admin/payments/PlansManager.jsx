import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, X, Check } from 'lucide-react';

export default function PlansManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const items = await base44.entities.SubscriptionPlan.list('sort_order', 100);
      setPlans(items);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (plan) => {
    try {
      await base44.entities.SubscriptionPlan.update(plan.id, { active: !plan.active });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, active: !p.active } : p)));
    } catch {}
  };

  const del = async (plan) => {
    if (!confirm(`"${plan.name}" paketini silmek istediğinize emin misiniz?`)) return;
    try {
      await base44.entities.SubscriptionPlan.delete(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } catch {}
  };

  const save = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.SubscriptionPlan.update(editing.id, data);
      } else {
        await base44.entities.SubscriptionPlan.create(data);
      }
      setShowForm(false); setEditing(null);
      load();
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Abonelik Paketleri</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
          <Plus className="w-4 h-4" /> Yeni Paket
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-[#16161e] rounded-xl p-8 text-center text-gray-400">Henüz paket oluşturulmadı.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((p) => (
            <div key={p.id} className="bg-[#16161e] border border-white/5 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-white">{p.name}</h3>
                  <p className="text-2xl font-bold text-purple-400 mt-1">{p.price} ₺</p>
                  <p className="text-xs text-gray-400">{p.duration_days || 30} gün</p>
                </div>
                <button onClick={() => toggleActive(p)} className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${p.active ? 'bg-green-500' : 'bg-red-500'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${p.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {p.description && <p className="text-xs text-gray-400 mb-2">{p.description}</p>}
              {(p.features || []).length > 0 && (
                <ul className="space-y-1 mb-3">
                  {(p.features || []).map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                <span className={`text-xs font-semibold ${p.active ? 'text-green-400' : 'text-red-400'}`}>{p.active ? 'Aktif' : 'Pasif'}</span>
                <div className="ml-auto flex gap-1">
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-2 rounded-lg hover:bg-white/5 text-gray-400"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => del(p)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <PlanForm plan={editing} saving={saving} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function PlanForm({ plan, saving, onSave, onClose }) {
  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [price, setPrice] = useState(plan?.price || 0);
  const [durationDays, setDurationDays] = useState(plan?.duration_days || 30);
  const [durationLabel, setDurationLabel] = useState(plan?.duration_label || '');
  const [features, setFeatures] = useState((plan?.features || []).join('\n'));
  const [sortOrder, setSortOrder] = useState(plan?.sort_order || 0);
  const [active, setActive] = useState(plan?.active !== false);

  const submit = (e) => {
    e.preventDefault();
    onSave({
      name, description, price: Number(price), duration_days: Number(durationDays),
      duration_label: durationLabel || `${durationDays} Gün`,
      features: features.split('\n').map((f) => f.trim()).filter(Boolean),
      sort_order: Number(sortOrder), active,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#16161e] border border-white/10 rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{plan ? 'Paket Düzenle' : 'Yeni Paket'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="text-xs text-gray-400 mb-1 block">Paket Adı</label><input value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500" /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Açıklama</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Fiyat (₺)</label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500" /></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Gün Sayısı</label><input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} required className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500" /></div>
          </div>
          <div><label className="text-xs text-gray-400 mb-1 block">Süre Etiketi (örn: 1 Ay, 30 Gün)</label><input value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} placeholder="30 Gün" className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500" /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Özellikler (her satır bir özellik)</label><textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} placeholder="Film ve dizilere erişim&#10;Oda oluşturma" className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500" /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Sıralama</label><input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-purple-500" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-purple-500" /><span className="text-sm text-gray-300">Aktif</span></label>
          <button type="submit" disabled={saving} className="w-full py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </form>
      </div>
    </div>
  );
}