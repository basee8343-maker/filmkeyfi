import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { isModerator } from '@/lib/roles';

export default function ProfileRoomActions({ userId, me, roomId }) {
  const { toast } = useToast();
  const [room, setRoom] = useState(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setBlocked((me?.blocked_users || []).includes(userId)); }, [me?.blocked_users, userId]);
  useEffect(() => {
    if (!roomId) { setRoom(null); return; }
    let active = true;
    setRoom(null); setError('');
    base44.functions.invoke('room-presence', { action: 'get', room_id: roomId }).then((res) => { if (active) setRoom(res.data?.room); }).catch(() => { if (active) setError('Oda bilgileri yüklenemedi.'); });
    const off = base44.entities.Room.subscribe((event) => { if ((event.data?.id || event.id) === roomId) setRoom((prev) => event.type === 'delete' ? null : { ...prev, ...event.data }); });
    return () => { active = false; off(); };
  }, [roomId]);
  if (!me || me.id === userId) return null;
  const participant = room?.participants?.find((p) => p.user_id === userId);
  const canMod = room && (room.owner_id === me.id || isModerator(me) || room.room_moderators?.includes(me.id));
  const act = async (action) => {
    setBusy(true); setError('');
    try {
      if (action === 'block') {
        const current = await base44.auth.me();
        const ids = current.blocked_users || [];
        await base44.auth.updateMe({ blocked_users: blocked ? ids.filter((id) => id !== userId) : [...new Set([...ids, userId])] });
        setBlocked(!blocked); toast({ title: blocked ? 'Engel kaldırıldı' : 'Kullanıcı engellendi' });
      } else {
        await base44.functions.invoke('room-presence', { action, room_id: roomId, target_id: userId });
        setRoom((prev) => ({ ...prev, participants: action === 'kick' ? prev.participants.filter((p) => p.user_id !== userId) : prev.participants.map((p) => p.user_id === userId ? { ...p, muted: !p.muted } : p) }));
        toast({ title: action === 'kick' ? 'Kullanıcı odadan çıkarıldı' : 'Mikrofon durumu güncellendi' });
      }
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  return <div className="mt-4 flex w-full flex-col gap-2 border-t border-border pt-4">
    <button disabled={busy} onClick={() => act('block')} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold disabled:opacity-50">{blocked ? 'Engeli Kaldır' : 'Engelle'}</button>
    {canMod && participant && <><p className="text-xs text-muted-foreground">{room.name} — Oda işlemleri</p>{room.voice_enabled && <button disabled={busy} onClick={() => act('toggle-mute')} className="rounded-lg bg-secondary px-4 py-2 text-sm disabled:opacity-50">{participant.muted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}</button>}<button disabled={busy} onClick={() => act('kick')} className="rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-50">Odadan At</button></>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}