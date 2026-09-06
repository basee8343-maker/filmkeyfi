import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useXp, { useXpConfig } from '@/hooks/useXp';
import XpAvatar from '@/components/xp/XpAvatar';
import { useToast } from '@/components/ui/use-toast';

export default function XpFrameSelector({ user }) {
  const { toast } = useToast();
  const { frames } = useXpConfig();
  const stats = useXp([user.id])[user.id];
  const [saving, setSaving] = useState('');
  const unlocked = frames.filter((frame) => frame.active !== false && (frame.min_xp || 0) <= (stats?.xp || 0));
  const selectedId = stats?.row?.manual_frame_id || '';

  const choose = async (frameId) => {
    setSaving(frameId || 'automatic');
    try {
      await base44.functions.invoke('xp-service', { action: 'select_frame', frame_id: frameId });
      toast({ title: frameId ? 'XP çerçevesi seçildi' : 'Otomatik XP çerçevesi açıldı' });
    } catch (error) {
      toast({ title: 'XP çerçevesi değiştirilemedi', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally { setSaving(''); }
  };

  return <section className="rounded-2xl border border-border bg-card p-5">
    <h2 className="font-bold">XP Çerçevelerim</h2>
    <p className="mb-4 text-xs text-muted-foreground">XP seviyenle açılan çerçevelerden birini seç.</p>
    <button disabled={!!saving} onClick={() => choose('')} className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${!selectedId ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30'}`}>Otomatik: En yüksek açık çerçeve</button>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {unlocked.map((frame) => <button key={frame.id} disabled={!!saving} onClick={() => choose(frame.id)} className={`rounded-xl border p-3 disabled:opacity-50 ${selectedId === frame.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30'}`}>
        <XpAvatar avatar={user.avatar} name={user.username || user.full_name} frame={frame} size="lg" className="mx-auto" />
        <span className="mt-2 block text-xs font-semibold">{frame.name}</span>
      </button>)}
    </div>
  </section>;
}