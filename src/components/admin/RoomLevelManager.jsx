import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RoomLevelBadge from '@/components/levels/RoomLevelBadge';

export default function RoomLevelManager({ user, level, onUpdated }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(level || 1));
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setValue(String(level || 1)); }, [open, level]);
  const save = async () => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) { toast({ title: 'Geçersiz LVL', description: '1–1000 arasında tam sayı girin.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await base44.functions.invoke('role-management', { action: 'set_room_level', user_id: user.id, level: parsed });
      toast({ title: 'LVL güncellendi', description: `${user.username || user.full_name || 'Kullanıcı'} · LVL ${parsed}` });
      setOpen(false); onUpdated?.();
    } catch (error) { toast({ title: 'LVL güncellenemedi', description: error.response?.data?.error || error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <><button onClick={() => setOpen(true)} className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap">LVL {level || 1}</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="w-[calc(100%-2rem)] rounded-xl"><DialogHeader><DialogTitle>Kullanıcı LVL Yönetimi</DialogTitle><DialogDescription>Bu değer normal ve özel odalarda, sohbette ve profilde ortak gösterilir.</DialogDescription></DialogHeader><div className="flex flex-col gap-4"><div className="flex justify-center"><RoomLevelBadge level={Number(value) || 1} profile textOnly /></div><label className="text-sm font-medium">LVL (1–1000)<input type="number" min="1" max="1000" step="1" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" /></label><button disabled={saving} onClick={save} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button></div></DialogContent></Dialog></>;
}