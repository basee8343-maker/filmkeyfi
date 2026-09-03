import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, Film, Sparkles, MessageSquare, Lock as LockIcon, Users, AlertCircle } from "lucide-react";
import AuthBackground from "@/components/auth/AuthBackground";
import SupportWidget from "@/components/auth/SupportWidget";
import DownloadButtons from "@/components/DownloadButtons";
import { safeReturnTo } from "@/lib/authReturnTo";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import LegalLinks from "@/components/auth/LegalLinks";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');
  const returnTo = safeReturnTo();
  const bannedParam = new URLSearchParams(window.location.search).get('banned');
  const [banned] = useState(bannedParam === '1');
  const removedParam = new URLSearchParams(window.location.search).get('removed');
  const [removed] = useState(removedParam === '1');
  const kickedParam = new URLSearchParams(window.location.search).get('kicked');
  const [kicked] = useState(kickedParam === '1');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      const me = await base44.auth.me();
      if (me.role === 'banned' || me.membership_status === 'suspended') {
        await base44.auth.logout();
        setError("Hesabınız askıya alınmıştır. Giriş yapamazsınız. İletişime geçin.");
        return;
      }
      const privileged = me.role === 'admin' || me.role === 'moderator';
      const membershipActive = me.membership_status === 'active' && (!me.membership_end || new Date(me.membership_end) > new Date());
      try { const res = await base44.functions.invoke('register-session', { device_session: localStorage.getItem('filmkeyfi_session_' + me.id) || '' }); if (res?.data?.session_id) localStorage.setItem('filmkeyfi_session_' + me.id, res.data.session_id); } catch {}
      window.location.href = privileged || membershipActive ? returnTo : '/abonelik';
    } catch (err) {
      setError(err.message || "Geçersiz e-posta veya şifre");
    } finally {
      setLoading(false);
    }
  };

  const handleProvider = async (provider) => {
    setError(''); setSocialLoading(provider);
    try { await base44.auth.loginWithProvider(provider, returnTo); }
    catch (err) { setError(err.message || 'Sosyal giriş başlatılamadı'); setSocialLoading(''); }
  };

  const features = [
    { icon: Sparkles, label: "Yüksek Kalite" },
    { icon: MessageSquare, label: "Canlı Oda Sohbeti" },
    { icon: LockIcon, label: "Şifreli & Şifresiz Odalar" },
    { icon: Users, label: "Arkadaşlarla İzle" },
  ];

  return (
    <AuthBackground>
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#e50914] flex items-center justify-center">
            <Film className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">FİLM KEYFİ</h1>
        </div>
        <p className="text-sm text-[#a0a0a0]">Filmini seç, keyfini çıkar.</p>
      </div>

      {/* Login Box */}
      <div className="bg-[#141414]/95 backdrop-blur-sm rounded-2xl border border-[#2a2a2a] p-7 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Hoş Geldin!</h2>
          <p className="text-sm text-[#a0a0a0] mt-1">Hesabına giriş yaparak devam et.</p>
        </div>

        {banned && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Hesabınız Askıya Alındı</p>
              <p className="mt-1 text-xs">Hesabınız yönetici tarafından askıya alınmıştır. Giriş yapamazsınız. Lütfen destekle iletişime geçin.</p>
            </div>
          </div>
        )}
        {removed && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Hesabınız Silindi</p>
              <p className="mt-1 text-xs">Hesabınız yönetici tarafından silinmiştir. Giriş yapamazsınız.</p>
            </div>
          </div>
        )}
        {kicked && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Hesabınız Başka Cihazdan Açıldı</p>
              <p className="mt-1 text-xs">Hesabınıza başka bir cihazdan giriş yapıldığı için bu oturum kapatıldı.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#a0a0a0]">E-posta veya kullanıcı adı</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0]" aria-hidden="true" />
              <Input
                id="email"
                type="text"
                autoComplete="email"
                autoFocus
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-[#555] focus:border-[#e50914]"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#a0a0a0]">Şifre</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0]" aria-hidden="true" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-[#555] focus:border-[#e50914]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-[#e50914] bg-[#0a0a0a] border-[#2a2a2a]"
              />
              <span className="text-sm text-[#a0a0a0]">Beni hatırla</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-[#e50914] hover:underline">
              Şifremi Unuttum?
            </Link>
          </div>
          <Button
            type="submit"
            className="w-full h-12 font-semibold bg-[#e50914] hover:bg-[#f6121d] text-white"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Giriş yapılıyor...</>
            ) : (
              <>Giriş Yap <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2a2a2a]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#141414] px-3 text-[#a0a0a0]">veya</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <Button type="button" variant="outline" onClick={() => handleProvider('google')} disabled={!!socialLoading} className="h-12 border-[#2a2a2a] bg-white text-black hover:bg-[#eee] hover:text-black">
            {socialLoading === 'google' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GoogleIcon className="w-5 h-5 mr-2" />} Google ile Giriş
          </Button>
          <Button type="button" variant="outline" onClick={() => handleProvider('apple')} disabled={!!socialLoading} className="h-12 border-[#2a2a2a] bg-black text-white hover:bg-[#111] hover:text-white">
            {socialLoading === 'apple' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AppleIcon className="w-5 h-5 mr-2" />} Apple ile Giriş
          </Button>
        </div>
        <Link to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}>
          <Button type="button" variant="outline" className="w-full h-12 font-medium border-[#2a2a2a] bg-transparent text-white hover:bg-[#1a1a1a] hover:text-white">Hesap Oluştur</Button>
        </Link>
        <p className="text-center text-[11px] text-[#777] mt-4">Devam ederek yasal koşulları kabul etmiş olursunuz.</p>
        <LegalLinks className="w-full mt-2 text-[11px] text-[#a0a0a0]" />
      </div>

      {/* Footer Features */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        {features.map((f) => (
          <div key={f.label} className="flex items-center gap-2 text-xs text-[#a0a0a0]">
            <f.icon className="w-4 h-4 text-[#e50914] shrink-0" />
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      {/* Mobil indirme butonları */}
      <div className="mt-6">
        <p className="text-center text-xs text-[#a0a0a0] mb-3">📱 Telefonuna indir, her zaman yanında</p>
        <DownloadButtons variant="light" />
      </div>

      <p className="text-center text-xs text-[#555] mt-6">© 2024 Film Keyfi. Tüm hakları saklıdır.</p>

      {/* Canlı destek butonu */}
      <SupportWidget />
    </AuthBackground>
  );
}