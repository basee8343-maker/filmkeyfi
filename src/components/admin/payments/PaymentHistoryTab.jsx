import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function PaymentHistoryTab() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const items = await base44.entities.Payment.list('-created_date', 500);
      setPayments(items);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;

  const filtered = payments.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterMethod && p.payment_method !== filterMethod) return false;
    if (search && !(`${p.user_name} ${p.plan_name} ${p.transaction_id}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const statusBadge = (s) => {
    const map = { pending: { text: 'Bekliyor', cls: 'text-amber-400 bg-amber-500/10' }, approved: { text: 'Onaylandı', cls: 'text-green-400 bg-green-500/10' }, rejected: { text: 'Reddedildi', cls: 'text-red-400 bg-red-500/10' } };
    const m = map[s] || map.pending;
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.cls}`}>{m.text}</span>;
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">Ödeme Geçmişi</h2>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kullanıcı, paket, işlem no ara..." className="flex-1 min-w-[150px] bg-[#16161e] rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/5 focus:border-purple-500" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#16161e] rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/5">
          <option value="">Tüm Durumlar</option>
          <option value="pending">Bekliyor</option>
          <option value="approved">Onaylandı</option>
          <option value="rejected">Reddedildi</option>
        </select>
        <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="bg-[#16161e] rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/5">
          <option value="">Tüm Yöntemler</option>
          <option value="bank_transfer">Banka Transferi</option>
          <option value="paytr">PayTR</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#16161e] rounded-xl p-8 text-center text-gray-400">Ödeme kaydı bulunamadı.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="bg-[#16161e] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
                  {(p.user_name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm truncate">{p.user_name}</p>
                  <p className="text-xs text-gray-400">{p.plan_name} • {p.amount} ₺ • {p.payment_method_name}</p>
                </div>
                <div className="text-right shrink-0">
                  {statusBadge(p.status)}
                  <p className="text-xs text-gray-500 mt-1">{new Date(p.created_date).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">İşlem No: {p.transaction_id}</p>
              {p.status === 'rejected' && p.rejection_reason && <p className="text-xs text-red-400 mt-1">Red Nedeni: {p.rejection_reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}