import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Bell, Headphones, User, Settings, Shield, LogOut, X } from 'lucide-react';
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
    base44.entities.Notification.filter({ user_id: user.id, read: false }, '-created_date', 50)
      .then((r) => setUnread(r.length)).catch(() => {});
    const unsub = base44.entities.Notification.subscribe(() => {
      base44.entities.Notification.filter({ user_id: user.id, read: false }, '-created_date', 50)
        .then((r) => setUnread(r.length)).catch(() => {});
    });
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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
        <>
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ background: 'rgba(20,22,28,0.97)', border: '1px solid rgba(174,184,196,0.2)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 60px -15px rgba(0,0,0,0.8)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              {avatar ? (
                <Image src={avatar} className="w-10 h-10 rounded-full" fittingType="fill" />
              ) : (
                <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {displayName[0]?.toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{displayName}</p>
                <p className="text-xs text-white/50 truncate">{user?.email}</p>
              </div>
              <button onClick={() => setOpen(false)} className="lg:hidden p-1 text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              <Link to="/bildirimler" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 transition-colors">
                <div className="relative">
                  <Bell className="w-4 h-4" />
                  {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
                </div>
                <span className="flex-1">Bildirimler</span>
                {unread > 0 && <span className="text-xs text-primary font-semibold">{unread} yeni</span>}
              </Link>

              <Link to="/destek" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 transition-colors">
                <Headphones className="w-4 h-4" />
                <span>Destek Talebi</span>
              </Link>

              <div className="my-1 border-t border-white/10" />

              {isActive && (
                <Link to="/profil" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 transition-colors">
                  <User className="w-4 h-4" />
                  <span>Profilim</span>
                </Link>
              )}

              {isActive && (
                <Link to="/listem" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Listem</span>
                </Link>
              )}

              <Link to="/güvenlik-protokolü" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 transition-colors">
                <Shield className="w-4 h-4" />
                <span>Güvenlik Protokolü</span>
              </Link>

              {!isActive && (
                <Link to="/abonelik" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-primary/10 transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Abonelik</span>
                </Link>
              )}

              <div className="my-1 border-t border-white/10" />

              <button onClick={() => { setOpen(false); logout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut className="w-4 h-4" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}