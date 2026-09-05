import { useState } from 'react';
import { FRAME_DEFINITIONS } from '@/lib/roles';
import ProfileFrame from '@/components/ProfileFrame';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function FrameAssignmentSummary({ users, onUpdated }) {
  const { toast } = useToast();
  const withFrames = users.filter((u) => u.profile_frame);
  const [removing, setRemoving] = useState('');
  if (!withFrames.length) return <p className="text-sm text-muted-foreground">Henüz kimseye çerçeve verilmemiş.</p>;
  const remove = async (user) => {
    setRemoving(user.id);
    try {
      await base44.functions.invoke('role-management', { action: 'remove_frame', user_id: user.id });
      toast({ title: 'Çerçeve geri alındı', description: FRAME_DEFINITIONS[user.profile_frame]?.label || '' });
      onUpdated?.();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
    finally { setRemoving(''); }
  };
  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {withFrames.map((user) => {
      const info = FRAME_DEFINITIONS[user.profile_frame];
      const expired = user.profile_frame_expires_at && new Date(user.profile_frame_expires_at) < new Date();
      const expiringSoon = user.profile_frame_expires_at && !expired && new Date(user.profile_frame_expires_at).getTime() - Date.now() < 3 * 86400000;
      return <div key={user.id} className={`flex items-center gap-3 rounded-lg border p-2 ${expired ? 'border-red-500/50 bg-red-500/5' : expiringSoon ? 'border-amber-500/50 bg-amber-500/5' : 'border-border bg-card'}`}>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-visible"><ProfileFrame frame={user.profile_frame} avatar={user.avatar} name={user.username || user.full_name} size="xs" frameScale={user.profile_frame_scale} /></div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.username || user.full_name || '?'}</p><p className="truncate text-xs text-muted-foreground">{info?.label || user.profile_frame}</p>{user.profile_frame_expires_at && <p className={`text-[10px] ${expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : 'text-muted-foreground'}`}>{expired ? 'Süresi doldu' : `Bitiş: ${new Date(user.profile_frame_expires_at).toLocaleDateString('tr-TR')}`}</p>}</div>
        <button disabled={removing === user.id} onClick={() => remove(user)} className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-400 disabled:opacity-50">Geri Al</button>
      </div>;
    })}
  </div>;
}