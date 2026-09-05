import { History, UsersRound, Crown } from 'lucide-react';
import { Image } from '@/components/ui/image';
import RoomLevelBadge from '@/components/levels/RoomLevelBadge';

const ago = (value) => {
  if (!value) return 'yakın zamanda katıldı';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Az önce katıldı';
  if (minutes < 60) return `${minutes} dakika önce katıldı`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} saat önce katıldı`;
  return `${Math.floor(minutes / 1440)} gün önce katıldı`;
};

function Person({ person, profile, level, ownerId, status, onSelect }) {
  const avatar = person.avatar || profile?.avatar;
  return <button onClick={() => onSelect?.(person.user_id)} className="flex w-full min-w-0 items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-white/5"><span className="relative shrink-0">{avatar ? <Image src={avatar} className="h-8 w-8 rounded-full" fittingType="fill" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{(person.name || '?')[0]}</span>}<span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-black ${status === 'online' ? 'bg-green-400' : 'bg-red-500'}`} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{person.name}{person.user_id === ownerId && <Crown className="ml-1 inline h-3 w-3 text-amber-400" />}</span><span className="block truncate text-[10px] text-[#888]">{status === 'recent' ? ago(person.joined_at || person.left_at) : status === 'online' ? 'çevrim içi' : 'çevrim dışı'}</span></span><RoomLevelBadge level={level} textOnly /></button>;
}

export default function ParticipantHistoryPanel({ participants, recentParticipants, profiles, presenceMap, roomLevels, ownerId, onSelect }) {
  const recent = [...participants, ...recentParticipants].filter((p, i, all) => all.findIndex((item) => item.user_id === p.user_id) === i).sort((a, b) => new Date(b.joined_at || b.left_at || 0) - new Date(a.joined_at || a.left_at || 0));
  const columns = [{ title: `İzleyiciler (${participants.length})`, subtitle: 'Odada bulunan tüm izleyiciler', icon: UsersRound, items: participants, recent: false }, { title: 'Son Katılanlar', subtitle: 'Odaya son katılan izleyiciler', icon: History, items: recent, recent: true }];
  return <div className="grid h-full min-h-0 grid-cols-2 gap-2 bg-black p-2">{columns.map(({ title, subtitle, icon: Icon, items, recent: isRecent }) => <section key={title} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d]"><header className="flex shrink-0 items-start gap-2 border-b border-white/5 p-2"><span className="rounded-lg bg-amber-400/10 p-1.5"><Icon className="h-4 w-4 text-amber-400" /></span><span className="min-w-0"><strong className="block truncate text-xs text-white">{title}</strong><span className="block truncate text-[9px] text-[#888]">{subtitle}</span></span></header><div className="min-h-0 flex-1 overflow-y-auto p-1">{items.length ? items.map((person) => { const presence = presenceMap[person.user_id]; const online = presence?.online && Date.now() - new Date(presence.last_seen || 0).getTime() < 60000; return <Person key={person.user_id} person={person} profile={profiles[person.user_id]} level={roomLevels[person.user_id]} ownerId={ownerId} status={isRecent ? 'recent' : online ? 'online' : 'offline'} onSelect={onSelect} />; }) : <p className="px-2 py-8 text-center text-[10px] text-[#666]">Henüz kimse yok</p>}</div></section>)}</div>;
}