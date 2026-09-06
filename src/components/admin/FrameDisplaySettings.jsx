import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

// Sadece "Üstte profil ve çerçeve" giriş ayarı toggle'ı.
// Yakınlaştırma artık AvatarPositioner üzerinden yönetiliyor.
export default function FrameDisplaySettings({ user, onUpdated }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const automatic = (user.profile_frame || '').startsWith('lvl_');
  const toggle = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('role-management', { action: 'set_frame_display', user_id: user.id, entrance_enabled: !user.profile_frame_entrance_enabled });
      toast({ title: 'Giriş ayarı güncellendi' }); onUpdated?.();
    } catch (error) { toast({ title: 'Ayar kaydedilemedi', description: error.response?.data?.error || error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <div className="w-full rounded-xl border border-border bg-secondary/30 p-3">
    <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Üstte profil ve çerçeve</p><p className="text-xs text-muted-foreground">{automatic ? 'LVL çerçevesinde otomatik açık.' : 'Odaya girişte kompakt gösterilir.'}</p></div><button disabled={saving || automatic || !user.profile_frame} onClick={toggle} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${(automatic || user.profile_frame_entrance_enabled) ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'}`}>{automatic || user.profile_frame_entrance_enabled ? 'AÇIK' : 'KAPALI'}</button></div>
  </div>;
}