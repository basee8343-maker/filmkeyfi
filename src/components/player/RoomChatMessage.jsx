import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Shield, Trash2 } from 'lucide-react';
import { Image } from '@/components/ui/image';
import ProfileFrame from '@/components/ProfileFrame';
import RoleBadge from '@/components/RoleBadge';
import RoleNameEffect from '@/components/role/RoleNameEffect';
import RoleMessageEffect from '@/components/role/RoleMessageEffect';
import RoomLevelBadge, { getRoomLevelTier } from '@/components/levels/RoomLevelBadge';
import { getRoleInfo, isModerator } from '@/lib/roles';

function RoomChatMessage({ message, profile, level, ownerId, roomModerators, currentUserId, canDelete, onDelete, onImage }) {
  const role = getRoleInfo(profile || message);
  const avatar = profile?.avatar || message.user_avatar;
  const profileUrl = `/kullanici/${message.user_id}?room=${encodeURIComponent(message.room_id)}`;
  const trimmed = (message.text || '').trim();
  const emoji = ['😂','❤️','🔥','👏','🎉','😍','😱','😢','👍','🍿','🎬','💀'].includes(trimmed);
  const emojiMotion = ['😂','👏','😢','👍'].includes(trimmed) ? 'anim-emoji-bounce' : ['❤️','🎉','😍','🍿'].includes(trimmed) ? 'anim-emoji-pulse' : 'anim-emoji-shake';
  return <article className="group flex w-full min-w-0 shrink-0 items-start gap-2">
    <Link to={profileUrl} className="mt-1 shrink-0" aria-label={`${message.user_name} profilini aç`}>
      {profile?.profile_frame ? <ProfileFrame frame={profile.profile_frame} size="sm" avatar={avatar} name={message.user_name} /> : avatar ? <Image src={avatar} alt={message.user_name} className="h-7 w-7 rounded-full" fittingType="fill" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{(message.user_name || '?')[0]}</span>}
    </Link>
    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5">
        {message.user_id === ownerId && <Crown className="h-3 w-3 shrink-0 text-amber-400" />}
        {(roomModerators.includes(message.user_id) || isModerator(profile)) && message.user_id !== ownerId && <Shield className="h-3 w-3 shrink-0 text-blue-400" />}
        <Link to={profileUrl} className="min-w-0 max-w-full break-words text-xs font-semibold hover:underline [overflow-wrap:anywhere]"><RoleNameEffect nameEffect={role.name_effect} color={role.color}>{message.user_name}{currentUserId === message.user_id && ' (Sen)'}</RoleNameEffect></Link>
        {message.user_id === ownerId && <span className="text-[10px] font-bold text-amber-400">Oda Sahibi</span>}
        {profile && (profile.display_role || profile.custom_role?.name) && <RoleBadge user={profile} size="sm" showLabel={false} />}
      </div>
      <RoomLevelBadge level={level} />
      <div className="isolate min-w-0 max-w-full overflow-hidden rounded-xl p-2">
        <RoleMessageEffect className="max-w-full min-w-0 align-top" roleKey={profile?.display_role || (profile?.custom_role?.name ? 'custom' : '')} msgEffect={role.msg_effect} msgColor={role.color}>
          {message.file_url && <Image src={message.file_url} alt="Sohbet görseli" className="mb-1 block h-44 w-44 max-w-full cursor-pointer rounded-lg" fittingType="fit" onClick={() => onImage(message.file_url)} />}
          {message.text && <p className={`block h-auto max-w-full whitespace-pre-wrap break-words rounded-lg px-2.5 py-1.5 leading-relaxed [overflow-wrap:anywhere] ${emoji ? `text-3xl anim-emoji ${emojiMotion}` : 'text-sm'} room-level-message bg-secondary text-secondary-foreground`} data-level-tier={getRoomLevelTier(level)} style={{ maxWidth: 'min(100%, calc(35ch + 1.25rem))' }}>{message.text}</p>}
        </RoleMessageEffect>
      </div>
    </div>
    {canDelete && <button onClick={() => onDelete(message.id)} className="shrink-0 self-start rounded p-1 text-muted-foreground opacity-60 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100" aria-label="Mesajı sil"><Trash2 className="h-3.5 w-3.5" /></button>}
  </article>;
}
export default memo(RoomChatMessage);