import { ChevronLeft, Ban, UserMinus, Trash, Flag, CheckCheck, WifiOff } from 'lucide-react';
import { Image } from '@/components/ui/image';
import RoleBadge from '@/components/RoleBadge';

export default function ChatSettingsPanel({
  name, avatar, friendProfile, isBlocked, offlineEnabled,
  readReceiptsEnabled, onToggleReadReceipts, onToggleOffline,
  onBlock, onUnfriend, onClearChat, onReport, onClose,
  blocking, unfriending, clearing
}) {
  return (
    <div className="absolute inset-0 z-40 bg-background flex flex-col animate-slide-down">
      <header className="h-16 shrink-0 px-3 border-b border-border flex items-center bg-card">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary" aria-label="Geri">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="absolute left-1/2 -translate-x-1/2 font-bold">Sohbet Ayarları</h2>
      </header>
      <div className="flex-1 overflow-y-auto">
        {/* Profil */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          {avatar ? <Image src={avatar} className="w-16 h-16 rounded-full" fittingType="fill" /> : <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">{name?.[0]}</div>}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">{name}</h3>
            {friendProfile?.display_role && <RoleBadge user={{ display_role: friendProfile.display_role, role: friendProfile.role }} size="small" />}
          </div>
        </div>
        {/* Ayar listesi */}
        <div className="divide-y divide-border">
          {/* Engelle / Engeli Kaldır */}
          <button onClick={onBlock} disabled={blocking} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary disabled:opacity-50">
            <Ban className="w-5 h-5 text-destructive" />
            <span className="font-medium text-destructive">{blocking ? 'İşleniyor...' : isBlocked ? 'Engeli Kaldır' : 'Engelle'}</span>
          </button>
          {/* Okundu Tikleri */}
          <div className="w-full flex items-center justify-between px-4 py-4">
            <span className="flex items-center gap-3 font-medium"><CheckCheck className="w-5 h-5" />Okundu Tikleri</span>
            <button onClick={onToggleReadReceipts} className={`w-12 h-7 rounded-full transition-colors ${readReceiptsEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${readReceiptsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {/* Çevrim Dışı (bu sohbette) */}
          <div className="w-full flex items-center justify-between px-4 py-4">
            <div>
              <span className="flex items-center gap-3 font-medium"><WifiOff className="w-5 h-5" />Çevrim Dışı Görün</span>
              <p className="text-xs text-muted-foreground mt-0.5">Sadece bu sohbette geçerli, odalarda çevrim içi görünürsün</p>
            </div>
            <button onClick={onToggleOffline} className={`w-12 h-7 rounded-full transition-colors ${offlineEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${offlineEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {/* Arkadaşı Sil */}
          <button onClick={onUnfriend} disabled={unfriending} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary disabled:opacity-50">
            <UserMinus className="w-5 h-5 text-destructive" />
            <span className="font-medium text-destructive">{unfriending ? 'Kaldırılıyor...' : 'Arkadaşı Sil'}</span>
          </button>
          {/* Sohbeti Sil */}
          <button onClick={onClearChat} disabled={clearing} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary disabled:opacity-50">
            <Trash className="w-5 h-5 text-destructive" />
            <span className="font-medium text-destructive">{clearing ? 'Siliniyor...' : 'Sohbeti Sil'}</span>
          </button>
          {/* Şikayet Et */}
          <button onClick={onReport} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary">
            <Flag className="w-5 h-5 text-destructive" />
            <span className="font-medium text-destructive">Şikayet Et</span>
          </button>
        </div>
      </div>
    </div>
  );
}