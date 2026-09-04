import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Bell, Headphones, User, Settings, Shield, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { Image } from '@/components/ui/image';

export default function ProfileDropdown() {
  const { user } = useCurrentUser();
  const isActive = membershipActive(user);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    // DM bildirimlerini profil bildirimlerinden çıkar — sadece Sohbet tab'ında göster
    base44.entities.Notification.filter({ user_id: user.id, read: false, type: { $ne: 'dm' } }, '-created_date', 50)
        .then((r) => setUnread(r.length)).catch(() => {});
    const unsub = base44.entities.Notification.subscribe(() => {
      base44.entities.Notification.filter({ user_id: user.id, read: false, type: { $ne: 'dm' } }, '-created_date', 50)
        .then((r) => setUnread(r.length)).catch(() => {});
    });
    // social-badges-refresh event'ini dinle — DM geldiğinde anlık güncelle
    const onBadgesRefresh = () => {
      base44.entities.Notification.filter({ user_id: user.id, read: false, type: { $ne: 'dm' } }, '-created_date', 50)
        .then((r) => setUnread(r.length)).catch(() => {});
    };
    window.addEventListener('social-badges-refresh', onBadgesRefresh);
    return () => { unsub(); window.removeEventListener('social-badges-refresh', onBadgesRefresh); };
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const logout = () => { base44.auth.logout('/login'); };

  if (!user) return null;

  const avatar = user?.avatar;
  const displayName = user?.username || user?.full_name || 'Profilim';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 transition-all active:scale-95"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(174,184,196,0.35)',
          boxShadow: open ? '0 0 12px rgba(174,184,196,0.3)' : '0 0 6px rgba(174,184,196,0.12)',
        }}
      >
        {avatar ? (
          <Image src={avatar} className="w-7 h-7 rounded-full" fittingType="fill" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            {displayName[0]?.toUpperCase()}
          </span>
        )}
        <span className="hidden sm:block text-sm font-semibold text-white max-w-24 truncate">{displayName}</span>
        <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ background: 'rgba(18,18,21,0.98)', border: '1px solid rgba(174,184,196,0.15)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 60px -15px rgba(0,0,0,0.8)' }}>
            {/* Purple gradient accent */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.6), transparent 70%)' }} />
            {/* Header */}
            <div className="relative flex flex-col items-center gap-2 px-4 py-5 border-b border-white/10">
              <div className="w-16 h-16 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(231,76,60,0.6))' }}>
                {avatar ? (
                  <Image src={avatar} className="w-full h-full rounded-full" fittingType="fill" />
                ) : (
                  <span className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {displayName[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white truncate">{displayName}</p>
                <p className="text-xs text-white/50 truncate">{user?.email}</p>
                {user?.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(74,20,140,0.5)', color: '#d8b4fe' }}>
                    <Shield className="w-3 h-3" /> Yönetici
                  </span>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link to="/bildirimler" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="relative shrink-0">
                  <Bell className="w-5 h-5 text-white/70" />
                  {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Bildirimler</p>
                  <p className="text-xs text-white/50">Tüm bildirimlerinizi görüntüleyin</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
              </Link>

              <Link to="/destek" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                <Headphones className="w-5 h-5 text-white/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Destek Talebi</p>
                  <p className="text-xs text-white/50">Sorunlarınız için destek alın</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
              </Link>

              <div className="my-0.5 border-t border-white/10" />

              {isActive && (
                <Link to="/profil" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors relative">
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-purple-500" />
                  <User className="w-5 h-5 text-white/70 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Profilim</p>
                    <p className="text-xs text-white/50">Hesap bilgilerinizi düzenleyin</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                </Link>
              )}

              {isActive && (
                <Link to="/listem" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <Settings className="w-5 h-5 text-white/70 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Listem</p>
                    <p className="text-xs text-white/50">İzleme listenizi yönetin</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                </Link>
              )}

              <Link to="/güvenlik-protokolü" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                <Shield className="w-5 h-5 text-white/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Güvenlik Protokolü</p>
                  <p className="text-xs text-white/50">Hesabınızın güvenliğini artırın</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
              </Link>

              {!isActive && (
                <Link to="/abonelik" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors">
                  <Settings className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary">Abonelik</p>
                    <p className="text-xs text-white/50">Üyeliğinizi aktif edin</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                </Link>
              )}

              <div className="my-0.5 border-t border-white/10" />

              <button onClick={() => { setOpen(false); logout(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors">
                <LogOut className="w-5 h-5 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-red-400">Çıkış Yap</p>
                  <p className="text-xs text-white/50">Hesabınızdan güvenli çıkış yapın</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
              </button>
            </div>
          </div>
      )}
    </div>
  );
}