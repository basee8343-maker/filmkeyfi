import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { Check, Calendar, Copy, Landmark, CreditCard, Loader2, Clock, ArrowLeft, Shield, Hash } from 'lucide-react';

export default function Subscription() {
  const { user, loading: ul, reload } = useCurrentUser();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [methods, setMethods] = useState([]);
  const [mySub, setMySub] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paying, setPaying] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [error, setError] = useState('');
  const [ibanCopied, setIbanCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [planItems, methodsRes, subRes] = await Promise.allSettled([
        base44.entities.SubscriptionPlan.filter({ active: true }, 'sort_order', 50),
        base44.functions.invoke('payment-service', { action: 'get_available_methods' }),
        base44.functions.invoke('payment-service', { action: 'get_my_subscription' }),
      ]);
      if (planItems.status === 'fulfilled') setPlans(planItems.value || []);
      if (methodsRes.status === 'fulfilled') {
        const m = methodsRes.value;
        setMethods(m.data || m || []);
      }
      if (subRes.status === 'fulfilled') {
        const subData = subRes.value.data || subRes.value;
        setMySub(subData.subscription);
        setPendingPayments(subData.pendingPayments || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Referans numarası yoksa oluştur
  useEffect(() => {
    if (user && !user.payment_reference && !ul) {
      base44.functions.invoke('ensure-member-id').then(() => {
        if (typeof reload === 'function') reload();
      }).catch(() => {});
    }
  }, [user?.id, ul]);

  const bankMethod = methods.find((m) => m.provider_key === 'bank_transfer');

  const copyIban = () => {
    if (bankMethod?.iban) {
      navigator.clipboard?.writeText(bankMethod.iban);
      setIbanCopied(true);
      setTimeout(() => setIbanCopied(false), 2000);
    }
  };

  const copyRef = () => {
    if (user?.payment_reference) {
      navigator.clipboard?.writeText(user.payment_reference);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    }
  };

  const payBank = async () => {
    if (!selectedPlan) return;
    setPaying(true);
    setError('');
    try {
      const res = await base44.functions.invoke('payment-service', { action: 'create_bank_payment', plan_id: selectedPlan.id });
      const data = res.data || res;
      setConfirmModal({ message: data.message || 'Ödeme bildiriminiz başarıyla oluşturuldu. Admin onayından sonra hesabınız ve seçtiğiniz abonelik aktifleşecektir.' });
      const subRes = await base44.functions.invoke('payment-service', { action: 'get_my_subscription' });
      const subData = subRes.data || subRes;
      setPendingPayments(subData.pendingPayments || []);
      setSelectedPlan(null);
      setSelectedMethod(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Ödeme oluşturulamadı');
    }
    setPaying(false);
  };

  if (ul || loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  const isActive = membershipActive(user);
  const remainingDays = mySub?.end_date ? Math.ceil((new Date(mySub.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Ana Sayfa
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white mb-1">Abonelik & Ödeme</h1>
          <p className="text-sm text-gray-400">Aboneliğinizi yönetin</p>
        </div>

        {isActive && mySub && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-green-400 bg-green-500/20 px-3 py-1 rounded-full">AKTİF</span>
            </div>
            <h3 className="text-lg font-bold text-white">{mySub.plan_name}</h3>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div><p className="text-gray-400 text-xs">Başlangıç</p><p className="text-white">{new Date(mySub.start_date).toLocaleDateString('tr-TR')}</p></div>
              <div><p className="text-gray-400 text-xs">Bitiş</p><p className="text-white">{new Date(mySub.end_date).toLocaleDateString('tr-TR')}</p></div>
              <div><p className="text-gray-400 text-xs">Kalan Gün</p><p className="text-green-400 font-bold">{remainingDays} gün</p></div>
              <div><p className="text-gray-400 text-xs">Tutar</p><p className="text-white">{mySub.price} ₺</p></div>
            </div>
          </div>
        )}

        {pendingPayments.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">Admin Onayı Bekleniyor</span>
            </div>
            {pendingPayments.map((p) => (
              <div key={p.id} className="text-xs text-gray-300 mt-2">
                {p.plan_name} • {p.amount} ₺ • {p.payment_method_name} • {new Date(p.created_date).toLocaleDateString('tr-TR')}
              </div>
            ))}
            <p className="text-xs text-amber-400 mt-2">Bu ödeme için zaten bir onay talebiniz bulunmaktadır. Admin onayını bekleyiniz.</p>
          </div>
        )}

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        {!selectedPlan && !isActive && (
          <>
            {plans.length === 0 ? (
              <div className="bg-[#16161e] rounded-xl p-8 text-center text-gray-400">Henüz abonelik paketi bulunmuyor. Lütfen daha sonra tekrar deneyin.</div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-4">Paket Seçin</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {plans.map((p) => (
                    <button key={p.id} onClick={() => setSelectedPlan(p)} className="text-left bg-[#16161e] border border-white/5 hover:border-purple-500/50 rounded-xl p-5 transition-colors">
                      <h3 className="font-bold text-white">{p.name}</h3>
                      <p className="text-3xl font-bold text-purple-400 mt-2">{p.price} ₺</p>
                      <p className="text-xs text-gray-400">{p.duration_label || `${p.duration_days} Gün`}</p>
                      {p.description && <p className="text-xs text-gray-400 mt-2">{p.description}</p>}
                      {(p.features || []).length > 0 && (
                        <ul className="space-y-1 mt-3">
                          {(p.features || []).map((f, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-xs text-gray-300">
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {selectedPlan && !isActive && (
          <div className="bg-[#16161e] border border-white/5 rounded-xl p-5">
            <button onClick={() => { setSelectedPlan(null); setSelectedMethod(null); }} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-3">
              <ArrowLeft className="w-4 h-4" /> Paket Değiştir
            </button>
            <h2 className="text-xl font-bold text-white">{selectedPlan.name}</h2>
            <p className="text-2xl font-bold text-purple-400 mb-4">{selectedPlan.price} ₺ <span className="text-sm font-normal text-gray-400">{selectedPlan.duration_label || `${selectedPlan.duration_days} Gün`}</span></p>

            <h3 className="text-sm font-semibold text-gray-300 mb-3">Ödeme Yöntemi Seçin</h3>

            {methods.length === 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center text-sm text-amber-400">
                Şu anda aktif bir ödeme yöntemi bulunmuyor. Lütfen daha sonra tekrar deneyin.
              </div>
            ) : (
              <div className="space-y-2">
                {methods.map((m) => (
                  <button key={m.provider_key} onClick={() => setSelectedMethod(m)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${selectedMethod?.provider_key === m.provider_key ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-[#0d0d12] hover:border-white/10'}`}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: m.type === 'bank_transfer' ? '#3b82f620' : '#7c3aed20' }}>
                      {m.type === 'bank_transfer' ? <Landmark className="w-5 h-5 text-blue-400" /> : <CreditCard className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{m.display_name}</p>
                      {m.description && <p className="text-xs text-gray-400">{m.description}</p>}
                    </div>
                    {selectedMethod?.provider_key === m.provider_key && <Check className="w-5 h-5 text-purple-400" />}
                  </button>
                ))}
              </div>
            )}

            {selectedMethod?.provider_key === 'bank_transfer' && bankMethod && (
              <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2"><Landmark className="w-5 h-5 text-blue-400" /> Banka Transferi Bilgileri</h4>
                <div className="space-y-2 text-sm">
                  <div><p className="text-xs text-gray-400">Banka</p><p className="text-white">{bankMethod.bank_name}</p></div>
                  <div><p className="text-xs text-gray-400">Hesap Sahibi</p><p className="text-white">{bankMethod.account_holder}</p></div>
                  <div>
                    <p className="text-xs text-gray-400">IBAN</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono flex-1 break-all">{bankMethod.iban}</p>
                      <button onClick={copyIban} className="text-blue-400 p-2 rounded-lg hover:bg-blue-500/10 shrink-0">
                        {ibanCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {bankMethod.branch && <div><p className="text-xs text-gray-400">Şube</p><p className="text-white">{bankMethod.branch}</p></div>}
                  {user?.payment_reference && (
                    <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-purple-300">Ödeme Referans Numaranız (Açıklamaya yazın)</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-white font-bold text-lg font-mono tracking-wider">{user.payment_reference}</p>
                            <button onClick={copyRef} className="text-purple-400 p-1.5 rounded-lg hover:bg-purple-500/10 shrink-0">
                              {refCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {bankMethod.payment_instructions && <div className="mt-2 p-2 bg-white/5 rounded-lg"><p className="text-xs text-amber-400">{bankMethod.payment_instructions}</p></div>}
                </div>
                <p className="text-xs text-gray-400 mt-3">Parayı banka transferi ile gönderdikten sonra "Ödemeyi Yaptım" butonuna basın.</p>
                <button onClick={payBank} disabled={paying} className="w-full mt-3 py-3 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
                  {paying ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> İşleniyor...</> : 'Ödemeyi Yaptım'}
                </button>
              </div>
            )}

            {selectedMethod?.type === 'card' && (
              <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                <CreditCard className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-gray-300">Kart ödeme entegrasyonu hazırlanıyor. Şu anda banka transferini kullanabilirsiniz.</p>
              </div>
            )}
          </div>
        )}

        {!isActive && pendingPayments.length === 0 && !selectedPlan && plans.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Ödeme işleminizi tamamlayarak aboneliğinizi başlatabilirsiniz.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <button onClick={() => navigate('/odeme-gecmisim')} className="text-sm text-purple-400 hover:underline">Ödeme Geçmişim</button>
        </div>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirmModal(null)}>
          <div className="bg-[#16161e] border border-white/10 rounded-xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Ödemeniz Alındı</h3>
            <p className="text-sm text-gray-400 mb-4">{confirmModal.message}</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full">🟠 Admin Onayı Bekleniyor</span>
            </div>
            <button onClick={() => { setConfirmModal(null); navigate('/'); }} className="w-full py-3 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      )}
    </div>
  );
}