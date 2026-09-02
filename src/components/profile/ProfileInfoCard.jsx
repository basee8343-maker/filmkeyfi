import { CalendarDays, Mail, Package, Phone, Settings, User, Users } from 'lucide-react';

export default function ProfileInfoCard({ user, pkg, editing, form, setForm, onSave, onEdit, onCancel }) {
  if (editing) return <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
    <Field label="Kullanıcı Adı" value={form.username} onChange={(username) => setForm({ ...form, username })} />
    <Field label="Ad Soyad" value={form.full_name} onChange={(full_name) => setForm({ ...form, full_name })} disabled={user.role === 'moderator'} />
    <Field label="Telefon" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
    <div className="flex gap-2"><button onClick={onSave} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Kaydet</button><button onClick={onCancel} className="rounded-lg bg-secondary px-5 py-2.5 text-sm">İptal</button></div>
  </section>;
  const rows = [
    [User, 'Kullanıcı Adı', user.username || '-'], [Users, 'Ad Soyad', user.full_name || '-'], [User, 'Üye No', user.member_id || '-'],
    [Mail, 'E-posta', user.email], [Phone, 'Telefon', user.phone || 'Eklenmedi'], [Package, 'Paket', pkg?.name || '-'],
    [CalendarDays, 'Başlangıç', user.membership_start ? new Date(user.membership_start).toLocaleDateString('tr-TR') : '-'],
    [CalendarDays, 'Bitiş', user.role === 'admin' ? 'Süresiz' : user.membership_end ? new Date(user.membership_end).toLocaleDateString('tr-TR') : '-'],
  ];
  return <section className="rounded-2xl border border-border bg-card px-4 overflow-hidden">{rows.map(([Icon, label, value]) => <div key={label} className="flex items-center gap-3 border-b border-border py-3 last:border-0"><Icon className="w-5 h-5 text-muted-foreground shrink-0" /><span className="text-sm text-muted-foreground">{label}</span><span className="ml-auto max-w-[55%] truncate text-sm font-semibold text-right">{value}</span></div>)}<button onClick={onEdit} className="mb-4 mt-1 flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold"><Settings className="w-4 h-4" />Düzenle</button></section>;
}

function Field({ label, value, onChange, disabled }) { return <label className="block text-sm text-muted-foreground">{label}<input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" /></label>; }