import { useState } from 'react';
import { Camera, Crown, LogOut, Minus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import ProfileFrame from '@/components/ProfileFrame';
import RoleBadge from '@/components/RoleBadge';
import useRoomLevels from '@/hooks/useRoomLevels';
import RoomLevelBadge from '@/components/levels/RoomLevelBadge';
import useXp from '@/hooks/useXp';
import XpStatsCard from '@/components/xp/XpStatsCard';
import XpAvatar from '@/components/xp/XpAvatar';
import { daysInApp } from '@/lib/xp';
import { useToast } from '@/components/ui/use-toast';

export default function ProfileHeader({ user, pkg, expired, editing, avatar, onAvatar, onUpdated }) {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(user.profile_frame_scale || 100);
  const [zoomSaving, setZoomSaving] = useState(false);
  const name = user.username || user.full_name || 'Kullanıcı';
  const status = user.role === 'admin' ? 'Kurucu · Süresiz' : user.membership_status === 'pending' ? 'Onay Bekliyor' : expired ? 'Süresi Doldu' : pkg?.name || 'Aktif Üyelik';
  const hasRole = user.display_role || user.custom_role?.name;
  const { levels: roomLevels } = useRoomLevels([user.id]);
  const xpStats = useXp([user.id])[user.id];
  const adjust = (delta) => setZoom((z) => Math.min(180, Math.max(80, z + delta)));
  const saveZoom = async (val) => {
    setZoomSaving(true);
    try {
      await base44.functions.invoke('update-profile', { profile_frame_scale: Number(val) });
      await onUpdated?.();
      toast({ title: 'Profil yakınlaştırma kaydedildi' });
    } catch (error) { toast({ title: 'Kaydedilemedi', description: error.response?.data?.error || error.message, variant: 'destructive' }); }
    finally { setZoomSaving(false); }
  };
  return <header className="flex flex-col items-center text-center mb-6">
    <div className="relative mb-4">
      {user.profile_frame ? (
        <ProfileFrame frame={user.profile_frame} size="lg" avatar={avatar || user.avatar} name={name} frameScale={zoom} />
      ) : (
        <XpAvatar avatar={avatar || user.avatar} name={name} frame={xpStats?.frame} size="lg" />
      )}
      {editing && <label className="absolute right-1 bottom-1 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer z-10"><Camera className="w-5 h-5" /><input type="file" accept="image/*" className="hidden" onChange={onAvatar} /></label>}
    </div>
    {user.profile_frame && (
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => { const v = Math.max(80, zoom - 5); setZoom(v); saveZoom(v); }} disabled={zoomSaving || zoom <= 80} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary border border-border disabled:opacity-40"><Minus className="w-4 h-4" /></button>
        <span className="min-w-[3rem] text-xs font-semibold text-muted-foreground">%{zoom}</span>
        <button onClick={() => { const v = Math.min(180, zoom + 5); setZoom(v); saveZoom(v); }} disabled={zoomSaving || zoom >= 180} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary border border-border disabled:opacity-40"><Plus className="w-4 h-4" /></button>
      </div>
    )}
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-extrabold">{name}</h1>
      {user.role === 'admin' && <Crown className="w-5 h-5 text-amber-400" />}
    </div>
    <p className="text-sm text-muted-foreground">{user.email}</p>
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <span className="rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">{status}</span>
      {hasRole && <RoleBadge user={user} size="md" />}
      <RoomLevelBadge level={roomLevels[user.id]} profile />
    </div>
    <div className="mt-3 w-full max-w-md"><XpStatsCard stats={xpStats} days={daysInApp(user.created_date)} /></div>
    <div className="mt-4 flex gap-3">
      {user.role === 'admin' && <Link to="/admin" className="rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" />Admin Paneli</Link>}
      <button onClick={() => base44.auth.logout('/login')} className="rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold flex items-center gap-2"><LogOut className="w-4 h-4" />Çıkış</button>
    </div>
  </header>;
}