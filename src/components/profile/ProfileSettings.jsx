import { useState } from 'react';
import { KeyRound, ChevronDown, ShieldOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import BlockedUsers from '@/components/profile/BlockedUsers';
import XpFrameSelector from '@/components/profile/XpFrameSelector';
import ProfileFrames from '@/components/profile/ProfileFrames';
import AvatarPositioner from '@/components/profile/AvatarPositioner';
import FrameEntranceToggle from '@/components/profile/FrameEntranceToggle';
import useFriends from '@/hooks/useFriends';

export default function ProfileSettings({ user, onUpdated }) {
  const { toast } = useToast(); const [saving, setSaving] = useState(false); const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const isAdmin = user?.role === 'admin';
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
    {!isAdmin && <XpFrameSelector user={user} />}
    {!isAdmin && <ProfileFrames user={user} onUpdated={onUpdated} />}
    {!isAdmin && user.profile_frame && <AvatarPositioner user={user} onSaved={onUpdated} />}
    {!isAdmin && user.profile_frame && <FrameEntranceToggle user={user} onSaved={onUpdated} />}
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 space-y-3"><h2 className="flex items-center gap-2 font-bold"><KeyRound className="w-5 h-5" />Şifre Değiştir</h2><Password label="Mevcut Şifre" value={form.current} onChange={(current) => setForm({ ...form, current })} /><Password label="Yeni Şifre" value={form.next} onChange={(next) => setForm({ ...form, next })} /><Password label="Yeni Şifre Tekrar" value={form.confirm} onChange={(confirm) => setForm({ ...form, confirm })} /><button disabled={saving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}</button></form>
    <BlockedUsersSection />
  </div>;
}

function BlockedUsersSection() {
  const [open, setOpen] = useState(false);
  const { user, relations, loading } = useFriends();
  const count = user ? relations.filter((r) => r.status === 'blocked' && (r.blocked_by || []).includes(user.id)).length : 0;
  return <section className="rounded-2xl border border-border bg-card overflow-hidden">
    <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10"><ShieldOff className="w-5 h-5 text-red-400" /></div>
      <div className="flex-1">
        <p className="font-bold">Engellenenler Listesi</p>
        <p className="text-xs text-muted-foreground">{count > 0 ? `${count} engellenen üye` : 'Engellenen üye yok'}</p>
      </div>
      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="border-t border-border p-4"><BlockedUsers /></div>}
  </section>;
}

function Password({ label, value, onChange }) { return <label className="block text-sm text-muted-foreground">{label}<input required type="password" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-ring" /></label>; }