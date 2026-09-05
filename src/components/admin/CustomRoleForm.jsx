import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function CustomRoleForm({ user, onUpdated }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '', color: '#8b5cf6', show_in_room: true });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await base44.functions.invoke('role-management', { action: 'create_custom_role', user_id: user.id, ...form }); toast({ title: 'Özel rol eklendi' }); setOpen(false); onUpdated?.(); }
    catch (error) { toast({ title: 'Rol eklenemedi', description: error.response?.data?.error || error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  if (!open) return <button onClick={() => setOpen(true)} className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold">Özel Rol Ekle</button>;
  return <div className="w-full rounded-xl border border-border bg-secondary/30 p-3"><p className="mb-3 text-sm font-bold">Özel Rol Ekle</p><div className="grid gap-2 sm:grid-cols-3"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rol adı" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Simge" maxLength={4} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background p-1" /></div><label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={form.show_in_room} onChange={(e) => setForm({ ...form, show_in_room: e.target.checked })} /> Oda içinde rolü göster</label><div className="mt-3 flex gap-2"><button onClick={() => setOpen(false)} className="rounded-lg bg-secondary px-3 py-2 text-xs">İptal</button><button disabled={saving || !form.name.trim()} onClick={save} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{saving ? 'Ekleniyor...' : 'Rolü Ekle'}</button></div></div>;
}