import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useFrameCatalog } from '@/lib/FrameCatalogContext';
import ProfileFrame from '@/components/ProfileFrame';

export default function UserFrameList({ user, onUpdated }) {
  const { toast } = useToast();
  const { frames } = useFrameCatalog();
  const [removing, setRemoving] = useState('');
  const unlocked = user.unlocked_profile_frames || [];

  const removeFrame = async (frameKey) => {
    setRemoving(frameKey);
    try {
      await base44.functions.invoke('role-management', { action: 'remove_unlocked_frame', user_id: user.id, frame_key: frameKey });
      toast({ title: 'Çerçeve geri alındı', description: frames[frameKey]?.label || frameKey });
      onUpdated?.();
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally {
      setRemoving('');
    }
  };

  if (!unlocked.length) return <p className="py-2 text-xs text-muted-foreground">Bu kullanıcıya çerçeve verilmemiş.</p>;

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {unlocked.map((key) => {
        const info = frames[key];
        const isActive = user.profile_frame === key;
        return (
          <div key={key} className={`flex items-center gap-2 rounded-lg border p-1.5 ${isActive ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
            <div className="flex h-10 w-10 items-center justify-center overflow-visible">
              <ProfileFrame frame={key} size="xs" avatar={user.avatar} name={user.username || user.full_name} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{info?.label || key}{isActive ? ' · Aktif' : ''}</p>
            </div>
            <button disabled={removing === key} onClick={() => removeFrame(key)} className="rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-semibold text-red-400 disabled:opacity-50">Geri Al</button>
          </div>
        );
      })}
    </div>
  );
}