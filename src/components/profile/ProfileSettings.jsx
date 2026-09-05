import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import BlockedUsers from '@/components/profile/BlockedUsers';
import LocationSharing from '@/components/profile/LocationSharing';
import ProfileFrames from '@/components/profile/ProfileFrames';

export default function ProfileSettings({ user, onUpdated }) {
  const { toast } = useToast(); const [saving, setSaving] = useState(false); const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const submit = async (event) => {
    event.preventDefault();
    if (form.next.length < 8) return toast({ title: 'Yeni şifre en az 8 karakter olmalıdır', variant: 'destructive' });
    if (form.next !== form.confirm) return toast({ title: 'Yeni şifreler eşleşmiyor', variant: 'destructive' });
    setSaving(true);
    try {
      await base44.auth.changePassword({ userId: user.id, currentPassword: form.current, newPassword: form.next });
      setForm({ current: '', next: '', confirm: '' }); toast({ title: 'Şifreniz değiştirildi' });
    } catch (error) { toast({ title: 'Şifre değiştirilemedi', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <div className="space-y-5">
    <ProfileFrames user={user} onUpdated={onUpdated} />
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 space-y-3"><h2 className="flex items-center gap-2 font-bold"><KeyRound className="w-5 h-5" />Şifre Değiştir</h2><Password label="Mevcut Şifre" value={form.current} onChange={(current) => setForm({ ...form, current })} /><Password label="Yeni Şifre" value={form.next} onChange={(next) => setForm({ ...form, next })} /><Password label="Yeni Şifre Tekrar" value={form.confirm} onChange={(confirm) => setForm({ ...form, confirm })} /><button disabled={saving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}</button></form>
    <section><h2 className="mb-3 font-bold">Engellenenler Listesi</h2><BlockedUsers /></section>
    <LocationSharing user={user} />
  </div>;
}

function Password({ label, value, onChange }) { return <label className="block text-sm text-muted-foreground">{label}<input required type="password" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-ring" /></label>; }