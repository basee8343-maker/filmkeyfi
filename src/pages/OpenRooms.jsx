import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Lock, Loader2, Shield, Star, DoorOpen, Search } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function OpenRooms() {
  const { user } = useCurrentUser();
  const [rooms, setRooms] = useState([]);
  const [personalRooms, setPersonalRooms] = useState([]);
  const [movies, setMovies] = useState({});
  const [owners, setOwners] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOwners = async (rs) => {
    const ids = [...new Set(rs.map((r) => r.owner_id).filter(Boolean))];
    const profiles = await Promise.all(ids.map((uid) => base44.functions.invoke('user-profile', { user_id: uid }).catch(() => null)));
    const map = {};
    profiles.forEach((p, i) => { if (p) map[ids[i]] = p; });
    setOwners((prev) => ({ ...prev, ...map }));
  };

  useEffect(() => {
    const isAdmin = user?.role === 'admin';
    const load = async () => {
      try {
        const [r, m] = await Promise.all([
          base44.entities.Room.filter({ status: 'active' }, '-created_date', 200).catch(() => []),
          base44.entities.Movie.list(500).catch(() => []),
        ]);
        const normal = r.filter((x) => !x.is_personal && (isAdmin || !x.hidden) && (x.participants?.length || 0) > 0);
        const personal = r.filter((x) => x.is_personal && (isAdmin || !x.hidden) && x.status === 'active');
        setRooms(normal);
        setPersonalRooms(personal);
        const map = {}; m.forEach((mv) => { map[mv.id] = mv; });
        setMovies(map);
        fetchOwners([...normal, ...personal]);
      } finally { setLoading(false); }
    };
    load();
    const unsub = base44.entities.Room.subscribe((ev) => {
      const isAdmin2 = user?.role === 'admin';
      const isVisible = (x) => x.status === 'active' && (isAdmin2 || !x.hidden);
      if (ev.type === 'create' && ev.data?.status === 'active' && (isAdmin2 || !ev.data.hidden)) {
        if (ev.data.is_personal) {
          setPersonalRooms((p) => [ev.data, ...p.filter((x) => x.id !== ev.data.id)]);
        } else if ((ev.data.participants?.length || 0) > 0) {
          setRooms((p) => [ev.data, ...p.filter((x) => x.id !== ev.data.id)]);
        }
        fetchOwners([ev.data]);
      }
      if (ev.type === 'update') {
        if (ev.data.is_personal) {
          setPersonalRooms((p) => isVisible(ev.data) ? p.map((x) => x.id === ev.data.id ? ev.data : x).concat([ev.data]).filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i) : p.filter((x) => x.id !== ev.data.id));
          setRooms((p) => p.filter((x) => x.id !== ev.data.id));
        } else {
          setRooms((p) => p.map((x) => (x.id === ev.data.id ? ev.data : x)).filter((x) => isVisible(x) && !x.is_personal && (x.participants?.length || 0) > 0));
        }
      }
      if (ev.type === 'delete') {
        setRooms((p) => p.filter((x) => x.id !== ev.id));
        setPersonalRooms((p) => p.filter((x) => x.id !== ev.id));
      }
    });
    return unsub;
  }, [user?.role]);

  const activeCount = rooms.length + personalRooms.length;

  const RoomCard = ({ r, isPersonal }) => {
    const mv = movies[r.movie_id];
    const ownerInRoom = (r.participants || []).some((p) => p.user_id === r.owner_id);
    const o = owners[r.owner_id];
    const isAdmin = user?.role === 'admin';
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#1c1c1c] border border-white/5">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-14 h-14 rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg, #8e44ad, #e91e63)' }}>
            <div className="w-full h-full rounded-full overflow-hidden bg-[#0d0d0d] flex items-center justify-center">
              {isPersonal && o?.avatar ? <Image src={o.avatar} className="w-full h-full" fittingType="fill" /> :
               mv?.poster ? <Image src={mv.poster} className="w-full h-full" fittingType="fill" /> :
               <span className="text-xl font-bold text-white">{(r.owner_name || r.name || '?')[0]}</span>}
            </div>
          </div>
          <span className="flex items-center gap-0.5 text-[10px] text-[#a0a0a0]"><Users className="w-2.5 h-2.5" /> {r.participants?.length || 0}/{r.max_users}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{r.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {o?.avatar ? <img src={o.avatar} className="w-4 h-4 rounded-full object-cover" alt="" /> : <span className="w-4 h-4 rounded-full bg-gradient-to-br from-[#8e44ad] to-[#e91e63] flex items-center justify-center text-[8px] font-bold text-white">{(r.owner_name || '?')[0]}</span>}
            <span className="text-xs text-[#a0a0a0] truncate">{r.owner_name || o?.username || 'Kullanıcı'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {isPersonal && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#8e44ad]/20 text-[#c39bd3]"><Lock className="w-2.5 h-2.5" /> Kişisel Oda</span>}
            {isPersonal && r.personal_room_code && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8e44ad]/20 text-[#c39bd3] font-mono font-bold">Kod: {r.personal_room_code}</span>}
            {!isPersonal && r.room_number ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#a0a0a0] font-bold">Oda No: {r.room_number}</span> : null}
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#a0a0a0]"><Users className="w-2.5 h-2.5" /> {r.participants?.length || 0}/{r.max_users}</span>
            {r.password && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400"><Lock className="w-2.5 h-2.5" /> Kilitli</span>}
          </div>
        </div>
        <div className="shrink-0">
          {isPersonal ? (
            <Link to={`/oda/${r.id}`} className={`px-4 py-2 rounded-xl text-xs font-bold ${ownerInRoom || user?.id === r.owner_id || isAdmin ? 'text-white' : 'text-[#808080] bg-[#2a2a2a] pointer-events-none'}`} style={ownerInRoom || user?.id === r.owner_id || isAdmin ? { background: 'linear-gradient(135deg, #8e44ad, #7d3c98)' } : {}}>
              {ownerInRoom || user?.id === r.owner_id || isAdmin ? 'Açık' : 'Kapalı'}
            </Link>
          ) : (
            <Link to={`/oda/${r.id}`} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #8e44ad, #7d3c98)' }}>Katıl</Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-extrabold">Odalar</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1a1a1a] border border-white/5">
          <span className="w-7 h-7 rounded-full bg-[#8e44ad]/30 flex items-center justify-center">
            <DoorOpen className="w-4 h-4 text-[#c39bd3]" />
          </span>
          <span className="text-sm font-bold">{activeCount}</span>
          <span className="text-xs text-[#a0a0a0]">Aktif Oda</span>
          <span className="w-2 h-2 rounded-full bg-green-400" />
        </div>
      </div>
      <p className="text-sm text-[#808080] mb-5">Aktif Watch Party odalarına katıl.</p>

      <div className="flex gap-2 p-1 rounded-xl bg-[#1a1a1a] mb-5">
        <button onClick={() => setTab('open')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'open' ? 'text-white' : 'text-[#808080]'}`} style={tab === 'open' ? { background: 'rgba(255, 77, 77, 0.15)' } : {}}>
          {tab === 'open' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: '#ff4d4d' }} />}
          <DoorOpen className="w-4 h-4" /> Açık Odalar
        </button>
        <button onClick={() => setTab('personal')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'personal' ? 'text-white' : 'text-[#808080]'}`} style={tab === 'personal' ? { background: 'rgba(142, 68, 173, 0.15)' } : {}}>
          <Star className="w-4 h-4" /> Özel Odalar
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Oda numarası veya özel oda kodu ara..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#1a1a1a] border border-white/5 text-sm text-white placeholder:text-[#606060] outline-none focus:border-[#8e44ad]/50"
        />
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#8e44ad]" /></div> :
        tab === 'open' ? (
          rooms.length === 0 ? (
            <div className="text-center py-20 text-[#808080]">
              <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">Açık oda yok.</p>
              <Link to="/oda-kur" className="text-[#8e44ad] text-sm hover:underline">İlk odayı sen kur</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.filter((r) => !searchQuery.trim() || String(r.room_number) === searchQuery.trim()).map((r) => <RoomCard key={r.id} r={r} isPersonal={false} />)}
            </div>
          )
        ) : (
          personalRooms.length === 0 ? (
            <div className="text-center py-20 text-[#808080]">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">Özel oda yok.</p>
              <Link to="/oda-kur" className="text-[#8e44ad] text-sm hover:underline">İlk odayı sen kur</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {personalRooms.filter((r) => !searchQuery.trim() || r.personal_room_code === searchQuery.trim()).map((r) => <RoomCard key={r.id} r={r} isPersonal={true} />)}
            </div>
          )
        )
      }

      {tab === 'open' && personalRooms.length > 0 && (
        <Link to="/acik-odalar" onClick={() => setTab('personal')} className="mt-5 flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#1a1a1a] to-[#1a1a1a] border border-[#8e44ad]/30 active:scale-95 transition-transform">
          <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(142, 68, 173, 0.2)' }}>
            <Shield className="w-5 h-5 text-[#c39bd3]" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Özel Odalar</p>
            <p className="text-xs text-[#808080]">Kişisel odalar. Oda sahibi odadayken katılabilirsiniz.</p>
          </div>
          <span className="text-[#808080]">→</span>
        </Link>
      )}
    </div>
  );
}