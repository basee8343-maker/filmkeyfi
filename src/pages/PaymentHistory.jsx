import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Clock, Check, X } from 'lucide-react';

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Payment.list('-created_date', 100).then((items) => setPayments(items)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  const statusBadge = (s) => {
    const map = {
      pending: { text: 'Bekliyor', icon: Clock, cls: 'text-amber-400 bg-amber-500/10' },
      approved: { text: 'Onaylandı', icon: Check, cls: 'text-green-400 bg-green-500/10' },
      rejected: { text: 'Reddedildi', icon: X, cls: 'text-red-400 bg-red-500/10' },
    };
    const m = map[s] || map.pending;
    const Icon = m.icon;
    return <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${m.cls}`}><Icon className="w-3.5 h-3.5" /> {m.text}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/abonelik')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Abonelik
        </button>
        <h1 className="text-2xl font-extrabold text-white mb-1">Ödeme Geçmişim</h1>
        <p className="text-sm text-gray-400 mb-6">Tüm ödeme kayıtlarınız</p>

        {payments.length === 0 ? (
          <div className="bg-[#16161e] rounded-xl p-8 text-center text-gray-400">Henüz ödeme kaydınız yok.</div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="bg-[#16161e] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm">{p.plan_name}</p>
                    <p className="text-xs text-gray-400">{p.payment_method_name} • {new Date(p.created_date).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white">{p.amount} ₺</p>
                    {statusBadge(p.status)}
                  </div>
                </div>
                <p className="text-xs text-gray-500">İşlem No: {p.transaction_id}</p>
                {p.status === 'rejected' && p.rejection_reason && (
                  <p className="text-xs text-red-400 mt-1">Red Nedeni: {p.rejection_reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}