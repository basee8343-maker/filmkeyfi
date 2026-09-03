import React from "react";
import LoginPromoVideo from "@/components/auth/LoginPromoVideo";

export default function AuthBackground({ children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0a0a0a] px-4 py-10 overflow-hidden">
      {/* Arka plan: erkek karakter + film posterleri */}
      <img
        src="https://media.base44.com/images/public/6a77d66e4da6de214628ee62/a38a234ce_generated_image.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />
      {/* Yayınlanan tanıtım videosu varsa arka planı canlı oynatır */}
      <LoginPromoVideo />
      {/* Karartma katmanı — üst kısım hafif karartma, alt kısım tamamen açık */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 via-[#0a0a0a]/15 to-transparent pointer-events-none" />

      {/* İçerik */}
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}