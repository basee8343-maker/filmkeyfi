import { Camera, Crown, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';

export default function ProfileHeader({ user, pkg, expired, editing, avatar, onAvatar }) {
  const name = user.username || user.full_name || 'Kullanıcı';
  const status = user.role === 'admin' ? 'Kurucu · Süresiz' : user.membership_status === 'pending' ? 'Onay Bekliyor' : expired ? 'Süresi Doldu' : pkg?.name || 'Aktif Üyelik';
  return <header className="flex flex-col items-center text-center mb-7">
    <div className="relative p-1 rounded-full border-2 border-amber-400/70 shadow-lg">
      {avatar ? <Image src={avatar} className="w-32 h-32 rounded-full" fittingType="fill" /> : <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-bold">{name[0]}</div>}
      {editing && <label className="absolute right-1 bottom-1 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer"><Camera className="w-5 h-5" /><input type="file" accept="image/*" className="hidden" onChange={onAvatar} /></label>}
    </div>
    <h1 className="mt-4 text-3xl font-extrabold flex items-center gap-2">{name}{user.role === 'admin' && <Crown className="w-6 h-6 text-amber-400" />}</h1>
    <p className="text-muted-foreground">{user.email}</p>
    <span className="mt-2 rounded-md bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-400">{status}</span>
    <div className="mt-4 flex gap-3">
      {user.role === 'admin' && <Link to="/admin" className="rounded-full bg-secondary px-5 py-3 text-sm font-semibold flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" />Admin Paneli</Link>}
      <button onClick={() => base44.auth.logout('/login')} className="rounded-full bg-secondary px-5 py-3 text-sm font-semibold flex items-center gap-2"><LogOut className="w-4 h-4" />Çıkış</button>
    </div>
  </header>;
}