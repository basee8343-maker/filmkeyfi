import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, User, Camera, Eye, EyeOff, ArrowLeft, Check, CheckCircle2, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthBackground from "@/components/auth/AuthBackground";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import LegalLinks from "@/components/auth/LegalLinks";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [paymentRequired, setPaymentRequired] = useState(true);

  useEffect(() => {
    base44.functions.invoke('public-settings', {}).then((ps) => {
      const settings = ps.data || ps;
      setPaymentRequired(settings.payment_required !== false);
    }).catch(() => {});
  }, []);

  const onAvatar = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setAvatar(file_url); }
    catch { setError("Profil fotoğrafı yüklenemedi"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!acceptTerms) { setError("Kullanım koşullarını kabul etmelisiniz"); return; }
    if (password !== confirmPassword) { setError("Şifreler eşleşmiyor"); return; }
    if (password.length < 6) { setError("Şifre en az 6 karakter olmalı"); return; }
    // Yeni kayıt izni kontrolü
    try {
      const ps = await base44.functions.invoke('public-settings', {});
      const settings = ps.data || ps;
      if (settings.registration_open === false) {
        setError("Yeni kayıtlar şu anda kapalı. Lütfen daha sonra tekrar deneyin.");
        return;
      }
    } catch { /* devam et */ }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
        try {
          await base44.auth.updateMe({
            full_name: fullName, username, avatar,
            membership_status: paymentRequired ? "pending" : "active",
          });
          await base44.functions.invoke('ensure-member-id').catch(() => {});
        } catch {}
      }
      if (paymentRequired) {
        toast({ title: "Kayıt tamamlandı", description: "Aboneliğinizi aktif etmek için ödeme yapın." });
        window.location.href = "/abonelik";
      } else {
        toast({ title: "Kayıt tamamlandı", description: "Film Keyfi'ne hoş geldiniz!" });
        window.location.href = "/";
      }
    } catch (err) {
      setError(err.message || "Geçersiz doğrulama kodu");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Kod gönderildi", description: "E-postanızı kontrol edin." });
    } catch (err) {
      setError(err.message || "Kod gönderilemedi");
    }
  };

  const handleProvider = async (provider) => {
    if (!acceptTerms) { setError('Kullanım koşullarını kabul etmelisiniz'); return; }
    setError(''); setSocialLoading(provider);
    try { await base44.auth.loginWithProvider(provider, paymentRequired ? '/abonelik' : '/'); }
    catch (err) { setError(err.message || 'Sosyal kayıt başlatılamadı'); setSocialLoading(''); }
  };

  const pricingFeatures = [
    "Film ve dizilere erişim",
    "Oda oluşturma",
    "Şifreli / şifresiz oda oluşturma",
    "Arkadaşlarla birlikte film izleme",
    "Canlı oda sohbeti",
    "Profil sistemi",
  ];

  if (showOtp) {
    return (
      <AuthBackground>
        <div className="bg-[#141414]/95 backdrop-blur-sm rounded-2xl border border-[#2a2a2a] p-7 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-1">E-postanı doğrula</h2>
          <p className="text-sm text-[#a0a0a0] mb-6">{email} adresine bir kod gönderdik</p>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full h-12 font-semibold bg-[#e50914] hover:bg-[#f6121d] text-white" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Doğrulanıyor...</> : "Doğrula"}
          </Button>
          <p className="text-center text-sm text-[#a0a0a0] mt-4">Kod gelmedi mi? <button onClick={handleResend} className="text-[#e50914] font-medium hover:underline">Tekrar gönder</button></p>
        </div>
      </AuthBackground>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#0a0a0a] overflow-hidden">
      {/* Arka plan */}
      <div className="absolute inset-0 grid grid-cols-6 gap-1 opacity-15 pointer-events-none select-none">
        {[...Array(24)].map((_, i) => (
          <div key={i} style={{ backgroundImage: `linear-gradient(135deg, hsl(${(i * 23) % 360} 30% 15%), hsl(${(i * 17) % 360} 40% 8%))` }} />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/85 via-[#0a0a0a]/90 to-[#0a0a0a]/95 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Geri butonu */}
        <button onClick={() => navigate("/login")} className="inline-flex items-center gap-1.5 text-sm text-[#a0a0a0] hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Geri Dön
        </button>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { n: 1, label: "Hesap Bilgileri" },
              { n: 2, label: "Üyelik Seçimi" },
              { n: 3, label: "Ödeme & Aktivasyon" },
            ].map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${s.n === 1 ? "bg-[#e50914] text-white" : "bg-[#2a2a2a] text-[#a0a0a0]"}`}>
                    {s.n}
                  </div>
                  <span className={`text-xs ${s.n === 1 ? "text-white" : "text-[#a0a0a0]"}`}>{s.label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-2 mb-5 ${s.n < 2 ? "bg-[#e50914]" : "bg-[#2a2a2a]"}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* İçerik: 2 kolon */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sol: Form */}
          <div className="bg-[#141414]/95 backdrop-blur-sm rounded-2xl border border-[#2a2a2a] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Hesap Oluştur</h2>
            <p className="text-sm text-[#a0a0a0] mb-6">Lütfen bilgilerinizi eksiksiz doldurun.</p>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profil foto */}
              <div className="flex flex-col items-center mb-2">
                <label className="cursor-pointer">
                  <div className={`w-20 h-20 rounded-full border-2 border-dashed border-[#3a3a3a] flex items-center justify-center overflow-hidden bg-[#0a0a0a] hover:border-[#e50914] transition-colors`}>
                    {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : (
                      <div className="flex flex-col items-center gap-1 text-[#a0a0a0]">
                        <Camera className="w-5 h-5" />
                        <span className="text-[10px]">Profil Fotoğrafı Ekle</span>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullname" className="text-[#a0a0a0]">Ad Soyad</Label>
                <Input id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ad Soyad" className="h-11 bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-[#555] focus:border-[#e50914]" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#a0a0a0]">Kullanıcı adı</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullanici" className="h-11 bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-[#555] focus:border-[#e50914]" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#a0a0a0]">E-posta adresiniz</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0]" />
                  <Input id="email" type="email" autoComplete="email" placeholder="ornek@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-[#555] focus:border-[#e50914]" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#a0a0a0]">Şifre</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0]" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11 bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-[#555] focus:border-[#e50914]" required />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-white">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-[#a0a0a0]">Şifre tekrar</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0]" />
                  <Input id="confirm" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10 h-11 bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-[#555] focus:border-[#e50914]" required />
                  <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-white">{showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="w-4 h-4 mt-0.5 rounded accent-[#e50914] bg-[#0a0a0a] border-[#2a2a2a]" />
                <span className="text-xs text-[#a0a0a0]">Yasal koşulları okudum ve kabul ediyorum.</span>
              </label>
              <LegalLinks className="w-full text-[11px] text-[#e50914]" />
              <div className="relative py-2"><div className="border-t border-[#2a2a2a]" /><span className="absolute left-1/2 top-0 -translate-x-1/2 bg-[#141414] px-3 text-xs text-[#777]">veya</span></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Button type="button" variant="outline" onClick={() => handleProvider('google')} disabled={!!socialLoading} className="h-11 bg-white text-black border-white hover:bg-[#eee] hover:text-black">{socialLoading === 'google' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GoogleIcon className="w-5 h-5 mr-2" />} Google ile Üye Ol</Button>
                <Button type="button" variant="outline" onClick={() => handleProvider('apple')} disabled={!!socialLoading} className="h-11 bg-black text-white border-[#444] hover:bg-[#111] hover:text-white">{socialLoading === 'apple' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AppleIcon className="w-5 h-5 mr-2" />} Apple ile Üye Ol</Button>
              </div>
              <Button type="submit" className="w-full h-12 font-semibold bg-[#e50914] hover:bg-[#f6121d] text-white" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Hesap oluşturuluyor...</> : "Devam Et"}
              </Button>
            </form>
          </div>

          {/* Sağ: Üyelik kartı */}
          <div className="flex flex-col gap-4">
            <div className="relative bg-[#141414]/95 backdrop-blur-sm rounded-2xl border-2 border-[#e50914] p-6 shadow-2xl">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-[#e50914] text-white text-xs font-bold rounded-full">ÖNERİLEN</div>
              <div className="flex items-start justify-between mb-4 mt-2">
                <div>
                  <h3 className="text-lg font-bold text-white">Film Keyfi Üyeliği</h3>
                  <p className="text-2xl font-bold text-white mt-1">50 TL <span className="text-sm font-normal text-[#a0a0a0]">/ Üyelik</span></p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#e50914] flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {pricingFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#d0d0d0]">
                    <CheckCircle2 className="w-4 h-4 text-[#e50914] shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-11 font-semibold bg-[#e50914] hover:bg-[#f6121d] text-white">
                Ödeme Yap
              </Button>
            </div>

            {/* Alt bildirim */}
            <div className="bg-[#141414]/95 backdrop-blur-sm rounded-xl border border-[#2a2a2a] p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#e50914] shrink-0 mt-0.5" />
              <p className="text-xs text-[#a0a0a0] leading-relaxed">
                Ödeme yaptıktan sonra aboneliğiniz otomatik olarak aktif olacaktır. Admin onayı gerekmez.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}