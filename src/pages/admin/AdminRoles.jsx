import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import UserBadge from '@/components/admin/UserBadge';
import RoleFrameManager from '@/components/admin/RoleFrameManager';
import FrameDisplaySettings from '@/components/admin/FrameDisplaySettings';
import CustomRoleForm from '@/components/admin/CustomRoleForm';
import FrameAssignmentSummary from '@/components/admin/FrameAssignmentSummary';
import AvatarPositioner from '@/components/profile/AvatarPositioner';

export default function AdminRoles() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const load = () => base44.entities.User.list('-created_date', 500).then((items) => { setUsers(items); setLoading(false); });
  useEffect(() => { load(); const off = base44.entities.User.subscribe(load); return off; }, []);
  const filtered = users.filter((user) => `${user.username || ''} ${user.full_name || ''} ${user.email || ''} ${user.member_id || ''}`.toLowerCase().includes(query.toLowerCase()));
  const frameCount = users.filter((u) => u.profile_frame).length;
  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;
  return <div><h1 className="mb-1 text-2xl font-extrabold">Roller ve Çerçeveler</h1><p className="mb-4 text-sm text-muted-foreground">Rol, çerçeve boyutu ve odaya giriş görünümünü yönetin.</p><button onClick={() => setShowSummary(!showSummary)} className="mb-3 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold">{showSummary ? 'Çerçeve Özetini Gizle' : `Çerçeve Özeti (${frameCount})`}</button>{showSummary && <div className="mb-4 rounded-xl border border-border bg-card p-4"><h2 className="mb-3 font-bold">Kimde Çerçeve Var</h2><FrameAssignmentSummary users={users} onUpdated={load} /></div>}<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kullanıcı ara" className="mb-4 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" /><div className="space-y-4">{filtered.map((user) => <article key={user.id} className="rounded-xl border border-border bg-card p-4"><UserBadge userId={user.id} name={user.username || user.full_name || '?'} avatar={user.avatar} memberId={user.member_id} size="md" displayRole={user.display_role} customRole={user.custom_role} profileFrame={user.profile_frame} frameScale={user.profile_frame_scale} />{user.profile_frame_expires_at && <p className="mt-1 text-xs text-amber-400">Bitiş: {new Date(user.profile_frame_expires_at).toLocaleDateString('tr-TR')}</p>}<div className="mt-4 flex flex-wrap gap-2"><RoleFrameManager user={user} onUpdated={load} /><CustomRoleForm user={user} onUpdated={load} /></div>{user.profile_frame && <div className="mt-4"><AvatarPositioner user={user} targetUserId={user.id} onSaved={load} /></div>}{user.profile_frame && <div className="mt-4"><FrameDisplaySettings user={user} onUpdated={load} /></div>}</article>)}</div></div>;
}