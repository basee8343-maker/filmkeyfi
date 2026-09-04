import { useRef } from 'react';
import { ChevronLeft, Ban, UserMinus, Trash, Flag, CheckCheck, Wifi } from 'lucide-react';
import { Image } from '@/components/ui/image';
import RoleBadge from '@/components/RoleBadge';

export default function ChatSettingsPanel({
  name, avatar, friendProfile, isBlocked, onlineEnabled,
  readReceiptsEnabled, onToggleReadReceipts, onToggleOnline,
  onBlock, onUnfriend, onClearChat, onReport, onClose,
  blocking, unfriending, clearing
}) {
  const touchStart = useRef({ x: 0, y: 0 });
  return (
    <div
      className="absolute inset-0 z-40 bg-background flex flex-col animate-slide-down overflow-hidden"
      onTouchStart={(e) => { e.stopPropagation(); touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => { e.stopPropagation(); const dx = e.changedTouches[0].clientX - touchStart.current.x; const dy = e.changedTouches[0].clientY - touchStart.current.y; if (dx > 80 && dx > Math.abs(dy) * 1.5) onClose(); }}
    >
      <header className="shrink-0 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 border-b border-border bg-card">
        <div className="relative flex items-center h-10">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary shrink-0" aria-label="Geri">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 font-bold">Sohbet Ayarları</h2>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {/* Profil */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          {avatar ? <Image src={avatar} className="w-16 h-16 rounded-full shrink-0" fittingType="fill" /> : <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0">{name?.[0]}</div>}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">{name}</h3>
            {friendProfile?.display_role && <div className="mt-1"><RoleBadge user={{ display_role: friendProfile.display_role, role: friendProfile.role }} size="small" /></div>}
          </div>
        </div>
        {/* Ayar listesi */}
        <div className="divide-y divide-border">
          {/* Engelle / Engeli Kaldır */}
          <button onClick={onBlock} disabled={blocking} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary disabled:opacity-50">
            <Ban className="w-5 h-5 text-destructive shrink-0" />
            <span className="font-medium text-destructive">{blocking ? 'İşleniyor...' : isBlocked ? 'Engeli Kaldır' : 'Engelle'}</span>
          </button>
          {/* Okundu Tikleri */}
          <div className="w-full flex items-center justify-between px-4 py-4 gap-3">
            <span className="flex items-center gap-3 font-medium min-w-0"><CheckCheck className="w-5 h-5 shrink-0" />Okundu Tikleri</span>
            <button onClick={onToggleReadReceipts} className={`w-12 h-7 rounded-full transition-colors shrink-0 ${readReceiptsEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${readReceiptsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {/* Çevrim İçi (bu sohbette) */}
          <div className="w-full flex items-center justify-between px-4 py-4 gap-3">
            <div className="flex-1 min-w-0">
              <span className="flex items-center gap-3 font-medium"><Wifi className="w-5 h-5 shrink-0" />Çevrim İçi</span>
              <p className="text-xs text-muted-foreground mt-0.5">Kapatınca bu sohbette çevrim dışı görünürsün</p>
            </div>
            <button onClick={onToggleOnline} className={`w-12 h-7 rounded-full transition-colors shrink-0 ${onlineEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${onlineEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {/* Arkadaşı Sil */}
          <button onClick={onUnfriend} disabled={unfriending} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary disabled:opacity-50">
            <UserMinus className="w-5 h-5 text-destructive shrink-0" />
            <span className="font-medium text-destructive">{unfriending ? 'Kaldırılıyor...' : 'Arkadaşı Sil'}</span>
          </button>
          {/* Sohbeti Sil */}
          <button onClick={onClearChat} disabled={clearing} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary disabled:opacity-50">
            <Trash className="w-5 h-5 text-destructive shrink-0" />
            <span className="font-medium text-destructive">{clearing ? 'Siliniyor...' : 'Sohbeti Sil'}</span>
          </button>
          {/* Şikayet Et */}
          <button onClick={onReport} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary">
            <Flag className="w-5 h-5 text-destructive shrink-0" />
            <span className="font-medium text-destructive">Şikayet Et</span>
          </button>
        </div>
      </div>
    </div>
  );
}