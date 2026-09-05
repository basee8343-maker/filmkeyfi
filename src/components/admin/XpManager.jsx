import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useXpConfig } from '@/hooks/useXp';
import { formatXp } from '@/lib/xp';

export default function XpManager({ user, stats }) {
  const { toast } = useToast();
  const { frames } = useXpConfig();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('100');
  const [exact, setExact] = useState('');
  const [saving, setSaving] = useState(false);

  const run = async (payload, message) => {
    setSaving(true);
    try {
      await base44.functions.invoke('xp-service', payload);
      toast({ title: message });
    } catch (error) {
      toast({ title: 'İşlem başarısız', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const delta = Math.max(0, Math.floor(Number(amount) || 0));
  return <>
    <button onClick={() => setOpen(true)} className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap">XP {formatXp(stats?.xp)}</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-xl">
        <DialogHeader>
          <DialogTitle>XP ve Çerçeve Yönetimi</DialogTitle>
          <DialogDescription>{user.username || user.full_name || 'Kullanıcı'} · Mevcut çerçeve: {stats?.frame?.name || '—'}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold">⚡ {formatXp(stats?.xp)} XP</p>
          <label className="text-sm font-medium">XP Miktarı
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <div className="flex gap-2">
            <button disabled={saving} onClick={() => run({ action: 'add_xp', user_id: user.id, amount: delta }, 'XP eklendi')} className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">XP Ekle</button>
            <button disabled={saving} onClick={() => run({ action: 'add_xp', user_id: user.id, amount: -delta }, 'XP azaltıldı')} className="flex-1 rounded-lg bg-secondary px-3 py-2.5 text-sm font-semibold disabled:opacity-50">XP Azalt</button>
          </div>
          <label className="text-sm font-medium">Kesin XP Ata
            <input type="number" min="0" value={exact} onChange={(e) => setExact(e.target.value)} placeholder="Örn. 25000" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <button disabled={saving || exact === ''} onClick={() => run({ action: 'set_xp', user_id: user.id, xp: Math.max(0, Math.floor(Number(exact) || 0)) }, 'XP güncellendi')} className="rounded-lg bg-secondary px-3 py-2.5 text-sm font-semibold disabled:opacity-50">Kesin XP Kaydet</button>
          <label className="text-sm font-medium">Çerçeve Ataması
            <select value={stats?.manual ? stats.frame.id : ''} onChange={(e) => run({ action: 'set_manual_frame', user_id: user.id, frame_id: e.target.value }, e.target.value ? 'Manuel çerçeve atandı' : 'Otomatik XP çerçevesine dönüldü')} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring">
              <option value="">Otomatik XP Çerçevesi</option>
              {frames.map((frame) => <option key={frame.id} value={frame.id}>{frame.name} ({formatXp(frame.min_xp)} XP)</option>)}
            </select>
          </label>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}