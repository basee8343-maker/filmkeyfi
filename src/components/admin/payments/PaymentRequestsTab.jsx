import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Eye, Clock } from 'lucide-react';

export default function PaymentRequestsTab() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detail, setDetail] = useState(null);
  const [processing, setProcessing] = useState(null);

  const load = async () => {
    try {
      const items = await base44.entities.Payment.filter({ status: 'pending' }, '-created_date', 200);
      setPayments(items);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (payment) => {
    if (!confirm(`${payment.user_name} kullanıcısının ödemesini onaylamak istediğinize emin misiniz?`)) return;
    setProcessing(payment.id);
    try {
      await base44.functions.invoke('payment-service', { action: 'approve_payment', payment_id: payment.id });
      setPayments((prev) => prev.filter((p) => p.id !== payment.id));
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Onaylanamadı');
    }
    setProcessing(null);
  };

  const reject = async () => {
    if (!rejecting) return;
    setProcessing(rejecting.id);
    try {
      await base44.functions.invoke('payment-service', { action: 'reject_payment', payment_id: rejecting.id, reason: rejectReason || 'Ödeme doğrulanamadı.' });
      setPayments((prev) => prev.filter((p) => p.id !== rejecting.id));
      setRejecting(null); setRejectReason('');
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Reddedilemedi');
    }
    setProcessing(null);
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">Ödeme Talepleri</h2>
      {payments.length === 0 ? (
        <div className="bg-[#16161e] rounded-xl p-8 text-center text-gray-400">Bekleyen ödeme talebi yok.</div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="bg-[#16161e] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
                  {(p.user_name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm truncate">{p.user_name}</p>
                  <p className="text-xs text-gray-400">{p.plan_name} • {p.amount} ₺ • {p.payment_method_name}</p>
                  {p.payment_reference && <p className="text-xs text-purple-400 font-mono mt-0.5">Ref: {p.payment_reference}</p>}
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5" /> Bekliyor
                </span>
                <div className="flex gap-1 w-full sm:w-auto">
                  <button onClick={() => setDetail(p)} className="flex-1 sm:flex-none p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => approve(p)} disabled={processing === p.id} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm font-semibold disabled:opacity-50"><Check className="w-4 h-4" /> Onayla</button>
                  <button onClick={() => setRejecting(p)} disabled={processing === p.id} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-semibold disabled:opacity-50"><X className="w-4 h-4" /> Reddet</button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">İşlem No: {p.transaction_id} • {new Date(p.created_date).toLocaleString('tr-TR')}</p>
              {p.payment_reference && <p className="text-xs text-purple-400 mt-1">⚠️ Banka açıklamasında <b className="font-mono">{p.payment_reference}</b> referans numarasını arayın.</p>}
            </div>
          ))}
        </div>
      )}

      {/* Reddetme modalı */}
      {rejecting && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setRejecting(null)}>
          <div className="bg-[#16161e] border border-white/10 rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">Ödemeyi Reddet</h3>
            <p className="text-sm text-gray-400 mb-3">{rejecting.user_name} - {rejecting.plan_name} ({rejecting.amount} ₺)</p>
            <label className="text-xs text-gray-400 mb-1 block">Reddetme Nedeni</label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Ödeme doğrulanamadı." className="w-full bg-[#0d0d12] rounded-lg px-3 py-2.5 text-sm text-white outline-none border border-white/5 focus:border-red-500 mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setRejecting(null)} className="flex-1 py-2.5 rounded-lg bg-white/5 text-gray-300 text-sm font-semibold">İptal</button>
              <button onClick={reject} disabled={processing === rejecting.id} className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-400 text-sm font-semibold disabled:opacity-50">Reddet</button>
            </div>
          </div>
        </div>
      )}

      {/* Detay modalı */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-[#16161e] border border-white/10 rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Ödeme Detayı</h3>
            <div className="space-y-2 text-sm">
              <Row label="Kullanıcı" value={detail.user_name} />
              <Row label="E-posta" value={detail.user_email} />
              <Row label="Paket" value={detail.plan_name} />
              <Row label="Tutar" value={`${detail.amount} ₺`} />
              <Row label="Yöntem" value={detail.payment_method_name} />
              {detail.payment_reference && <Row label="Ödeme Ref. No" value={detail.payment_reference} />}
              <Row label="İşlem No" value={detail.transaction_id} />
              <Row label="Tarih" value={new Date(detail.created_date).toLocaleString('tr-TR')} />
              {detail.bank_name && <Row label="Banka" value={detail.bank_name} />}
              {detail.account_holder && <Row label="Hesap Sahibi" value={detail.account_holder} />}
              {detail.iban && <Row label="IBAN" value={detail.iban} />}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => approve(detail)} className="flex-1 py-2.5 rounded-lg bg-green-500/10 text-green-400 text-sm font-semibold">Onayla</button>
              <button onClick={() => { setRejecting(detail); setDetail(null); }} className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 text-sm font-semibold">Reddet</button>
            </div>
            <button onClick={() => setDetail(null)} className="w-full mt-2 py-2.5 rounded-lg bg-white/5 text-gray-300 text-sm">Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-white text-right font-medium truncate">{value}</span>
    </div>
  );
}