import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Clock, LogOut, ShieldCheck, CreditCard, Sparkles, Headphones, ArrowRight } from "lucide-react";
import SupportWidget from "@/components/auth/SupportWidget";

export default function PendingApproval() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(false);
  const [paymentAvailable, setPaymentAvailable] = useState(true);

  const check = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me.membership_status === "active") {
        window.location.href = "/";
        return;
      }
      const ps = await base44.functions.invoke('public-settings', {});
      const settings = ps.data || ps;
      setPaymentAvailable(settings.payment_available !== false);
    } catch {}
  };

  useEffect(() => {
    check();
    const interval = setInterval(() => {
      setChecking(true);
      check().finally(() => setChecking(false));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    base44.auth.logout("/login");
  };

  const showPayment = paymentAvailable;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Arka plan ızgarası */}
      <div className="absolute inset-0 grid grid-cols-4 gap-1 opacity-15 pointer-events-none select-none">
        {[...Array(16)].map((_, i) => (
          <div key={i} style={{ backgroundImage: `linear-gradient(135deg, hsl(${(i * 23) % 360} 30% 15%), hsl(${(i * 17) % 360} 40% 8%))` }} />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/85 via-[#0a0a0a]/90 to-[#0a0a0a]/95 pointer-events-none" />
      {/* Mor parıltı */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="relative">
          {/* Gradient çerçeve */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-purple-500/40 via-pink-500/30 to-purple-600/40 blur-[2px]" />
          <div className="relative bg-[#141414]/95 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
            {showPayment ? (
              <>
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                    <CreditCard className="w-11 h-11 text-amber-400" />
                  </div>
                </div>

                <div className="text-center mb-5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full mb-3">
                    <Sparkles className="w-3 h-3" /> ÖDEME BEKLİYOR
                  </span>
                  <h1 className="text-2xl font-extrabold text-white mb-2">Aboneliğinizi Aktifleştirin</h1>
                  <p className="text-sm text-[#a0a0a0] leading-relaxed">
                    Merhaba{user?.username ? <> <span className="text-amber-400 font-semibold">{user.username}</span></> : ""}, hesabınız oluşturuldu.
                    Aboneliğinizi aktif etmek için bir paket seçip ödeme yapmanız yeterlidir.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-300 mb-1">Otomatik Aktivasyon</p>
                      <p className="text-xs text-[#a0a0a0] leading-relaxed">
                        Ödemenizi tamamladıktan sonra aboneliğiniz otomatik olarak aktifleşir. Ekstra bekleme yok.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-[#a0a0a0] mb-5">
                  {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                  <span>Durum kontrol ediliyor...</span>
                </div>

                <button
                  onClick={() => navigate('/abonelik')}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
                >
                  <CreditCard className="w-4 h-4" /> Paket Seç ve Ödeme Yap <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-11 h-11 text-purple-400" />
                  </div>
                </div>

                <div className="text-center mb-5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full mb-3">
                    <Sparkles className="w-3 h-3" /> ONAY BEKLENİYOR
                  </span>
                  <h1 className="text-2xl font-extrabold text-white mb-2">Hesabınız İnceleniyor</h1>
                  <p className="text-sm text-[#a0a0a0] leading-relaxed">
                    Merhaba{user?.username ? ` ${user.username}` : ""}, hesabınız başarıyla oluşturuldu.
                    Aktivasyon için yönetici onayı beklenmektedir. Onaylandığında otomatik olarak ana sayfaya yönlendirileceksiniz.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-2xl p-4 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-purple-300 mb-1">Güvenli Onay Süreci</p>
                      <p className="text-xs text-[#a0a0a0] leading-relaxed">
                        Bu sayfa açık kaldığı sürece onay durumunuz otomatik kontrol edilir. Onaylandığında anında ana sayfaya geçeceksiniz.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-[#a0a0a0] mb-5">
                  {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                  <span>Onay durumu kontrol ediliyor...</span>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-[#a0a0a0]">
                  <Headphones className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sorularınız için canlı destek ekibimiz hazır.</span>
                </div>
              </>
            )}

            <button
              onClick={logout}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 text-sm text-[#a0a0a0] hover:text-white py-2.5 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Çıkış Yap
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-[#555] mt-6">© 2024 Film Keyfi. Tüm hakları saklıdır.</p>
      </div>

      <SupportWidget />
    </div>
  );
}