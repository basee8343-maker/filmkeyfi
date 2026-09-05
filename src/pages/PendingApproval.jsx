import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Clock, LogOut, ShieldCheck, CreditCard } from "lucide-react";
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

  // Ödeme varsa ödeme ekranı, yoksa admin onay ekranı
  const showPayment = paymentAvailable;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid grid-cols-4 gap-1 opacity-15 pointer-events-none">
        {[...Array(16)].map((_, i) => (
          <div key={i} style={{ backgroundImage: `linear-gradient(135deg, hsl(${(i * 23) % 360} 30% 15%), hsl(${(i * 17) % 360} 40% 8%))` }} />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/85 via-[#0a0a0a]/90 to-[#0a0a0a]/95 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="bg-[#141414]/95 backdrop-blur-sm rounded-2xl border border-[#2a2a2a] p-8 shadow-2xl">
          {showPayment ? (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Ödeme Bekleniyor</h1>
              <p className="text-sm text-[#a0a0a0] mb-6 leading-relaxed">
                Merhaba{user?.username ? ` ${user.username}` : ""}, hesabınız oluşturuldu.
                Aboneliğinizi aktif etmek için ödeme yapmanız yeterlidir. Admin onayı gerekmez.
                Ödeme yaptıktan sonra aboneliğiniz otomatik olarak aktif edilecektir.
              </p>

              <div className="flex items-center justify-center gap-2 text-xs text-[#a0a0a0] mb-6">
                {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                <span>Abonelik durumu kontrol ediliyor...</span>
              </div>

              <button
                onClick={() => navigate('/abonelik')}
                className="w-full bg-[#e50914] hover:bg-[#f6121d] text-white font-semibold py-3 rounded-lg mb-4 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" /> Abonelik Seç ve Ödeme Yap
              </button>

              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 mb-4">
                <p className="text-xs text-[#a0a0a0] leading-relaxed">
                  💡 Ödeme sonrası aboneliğiniz otomatik aktif olur. Sorularınız varsa canlı destek üzerinden ekibimize ulaşabilirsiniz.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-purple-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Admin Onayı Bekleniyor</h1>
              <p className="text-sm text-[#a0a0a0] mb-6 leading-relaxed">
                Merhaba{user?.username ? ` ${user.username}` : ""}, hesabınız başarıyla oluşturuldu.
                Hesabınızın aktifleştirilmesi için yönetici onayı beklenmektedir.
                Onay süreci tamamlandığında otomatik olarak ana sayfaya yönlendirileceksiniz.
              </p>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
                <p className="text-xs text-purple-300 leading-relaxed text-left">
                  📋 Onay süreciniz şu anda devam ediyor. Lütfen bekleyin, bu sayfa açık kaldığı sürece
                  onay durumunuz otomatik kontrol edilmektedir. Onaylandığında anında ana sayfaya geçeceksiniz.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-[#a0a0a0] mb-6">
                {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                <span>Onay durumu kontrol ediliyor...</span>
              </div>

              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 mb-4">
                <p className="text-xs text-[#a0a0a0] leading-relaxed">
                  💡 Onay süreciyle ilgili sorularınız varsa canlı destek üzerinden ekibimize ulaşabilirsiniz.
                </p>
              </div>
            </>
          )}

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-sm text-[#a0a0a0] hover:text-white"
          >
            <LogOut className="w-4 h-4" /> Çıkış Yap
          </button>
        </div>
        <p className="text-xs text-[#555] mt-6">© 2024 Film Keyfi. Tüm hakları saklıdır.</p>
      </div>

      <SupportWidget />
    </div>
  );
}