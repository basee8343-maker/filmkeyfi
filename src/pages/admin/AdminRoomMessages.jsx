import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RoomMessagePanel from '@/components/admin/RoomMessagePanel';
import { Search, ChevronLeft, ChevronRight, Users, MessageSquare } from 'lucide-react';

const PAGE_SIZE = 8;

export default function AdminRoomMessages() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [roomOwners, setRoomOwners] = useState({});
  const [roomMsgCounts, setRoomMsgCounts] = useState({});
  const [unread, setUnread] = useState({});
  const [active, setActive] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [owner, setOwner] = useState(null);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [msgProfiles, setMsgProfiles] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('messages');
  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const [menuMsg, setMenuMsg] = useState(null);
  const desktopScrollRef = useRef(null);
  const mobileScrollRef = useRef(null);
  const activeRef = useRef(null);
  activeRef.current = active;
  const msgProfilesRef = useRef({});
  msgProfilesRef.current = msgProfiles;

  // Load rooms + owners + message counts
  useEffect(() => {
    base44.entities.Room.list(200).then(async (rs) => {
      setRooms(rs);
      const oIds = [...new Set(rs.map((r) => r.owner_id).filter(Boolean))];
      const ops = await Promise.all(oIds.map((id) => base44.functions.invoke('user-profile', { user_id: id }).catch(() => null)));
      setRoomOwners(Object.fromEntries(oIds.map((id, i) => [id, ops[i]])));
    }).catch(() => {});

    // Load message counts (tek sorgu, sayım için)
    base44.entities.RoomMessage.list('-created_date', 500).then((msgs) => {
      const counts = {};
      msgs.forEach((m) => { counts[m.room_id] = (counts[m.room_id] || 0) + 1; });
      setRoomMsgCounts(counts);
    }).catch(() => {});
  }, []);

  // Subscribe to new messages — unread tracking + active room updates
  useEffect(() => {
    const unsub = base44.entities.RoomMessage.subscribe((ev) => {
      if (ev.type === 'create') {
        const msg = ev.data;
        setRoomMsgCounts((prev) => ({ ...prev, [msg.room_id]: (prev[msg.room_id] || 0) + 1 }));
        if (activeRef.current?.id === msg.room_id) {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.user_id && !msgProfilesRef.current[msg.user_id]) {
            base44.functions.invoke('user-profile', { user_id: msg.user_id }).then((p) => setMsgProfiles((prev) => ({ ...prev, [msg.user_id]: p }))).catch(() => {});
          }
        } else {
          setUnread((prev) => ({ ...prev, [msg.room_id]: (prev[msg.room_id] || 0) + 1 }));
        }
      }
      if (ev.type === 'delete') {
        const msg = ev.data;
        setRoomMsgCounts((prev) => ({ ...prev, [msg.room_id]: Math.max(0, (prev[msg.room_id] || 0) - 1) }));
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    });
    return unsub;
  }, []);

  // Load messages when active room changes
  useEffect(() => {
    if (!active) return;
    setOwner(null);
    setMessages([]);
    base44.functions.invoke('user-profile', { user_id: active.owner_id }).then(setOwner).catch(() => {});
    base44.entities.RoomMessage.filter({ room_id: active.id }, 'created_date', 500).then(async (ms) => {
      setMessages(ms);
      const uIds = [...new Set(ms.map((m) => m.user_id).filter(Boolean))];
      const ps = await Promise.all(uIds.map((id) => base44.functions.invoke('user-profile', { user_id: id }).catch(() => null)));
      setMsgProfiles(Object.fromEntries(uIds.map((id, i) => [id, ps[i]])));
    }).catch(() => {});
    const pIds = [...new Set((active.participants || []).map((p) => p.user_id))];
    Promise.all(pIds.map((pid) => base44.functions.invoke('user-profile', { user_id: pid }).catch(() => null))).then((ps) => setParticipantProfiles(Object.fromEntries(pIds.map((pid, i) => [pid, ps[i]]))));
    setTab('messages');
  }, [active?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (desktopScrollRef.current) desktopScrollRef.current.scrollTop = desktopScrollRef.current.scrollHeight;
    if (mobileScrollRef.current) mobileScrollRef.current.scrollTop = mobileScrollRef.current.scrollHeight;
  }, [messages]);

  // Stable room number map
  const roomNoMap = {};
  rooms.forEach((r, i) => { roomNoMap[r.id] = '#' + (1000 + i + 1); });

  const selectRoom = (r) => {
    setActive(r);
    setPanelOpen(true);
    setTab('messages');
    setUnread((prev) => ({ ...prev, [r.id]: 0 }));
  };

  const closePanel = () => setPanelOpen(false);

  const log = async (action, target) => { await base44.entities.AdminLog.create({ admin_id: admin?.id, admin_name: admin?.username, action, target }).catch(() => {}); };

  const del = async () => {
    if (!confirm) return;
    const id = confirm.id;
    await base44.entities.RoomMessage.delete(id);
    await log('Mesaj silindi', active?.name);
    toast({ title: 'Silindi' });
    setConfirm(null);
    setMenuMsg(null);
    setMessages((p) => p.filter((m) => m.id !== id));
  };

  const delAll = async () => {
    if (!active) return;
    await base44.entities.RoomMessage.deleteMany({ room_id: active.id });
    await log('Tüm oda mesajları silindi', active.name);
    setMessages([]);
    setConfirmAll(false);
    toast({ title: 'Tüm mesajlar silindi' });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !active) return;
    try {
      const msg = await base44.entities.RoomMessage.create({
        room_id: active.id, user_id: admin.id,
        user_name: admin.username || admin.full_name || 'Admin',
        user_avatar: admin.avatar || '', text, type: 'user',
      });
      setMessages((p) => p.some((m) => m.id === msg.id) ? p : [...p, msg]);
      setInput('');
    } catch (e) { toast({ title: 'Gönderilemedi', variant: 'destructive' }); }
  };

  const copyRoomNo = () => {
    if (!active) return;
    const num = roomNoMap[active.id] || '';
    navigator.clipboard?.writeText(num);
    toast({ title: 'Kopyalandı', description: num });
  };

  const exportMessages = () => {
    if (!active || messages.length === 0) { toast({ title: 'Dışa aktarılacak mesaj yok' }); return; }
    const lines = messages.map((m) => {
      const t = new Date(m.created_date).toLocaleString('tr-TR');
      return m.type === 'system' ? `[${t}] SİSTEM: ${m.text}` : `[${t}] ${m.user_name}: ${m.text}`;
    });
    const blob = new Blob([`Oda: ${active.name}\nOda Sahibi: ${active.owner_name || '-'}\nOluşturulma: ${new Date(active.created_date).toLocaleString('tr-TR')}\n\n${lines.join('\n')}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${active.name.replace(/\s+/g, '_')}_mesajlar.txt`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Dışa aktarıldı' });
  };

  const filtered = rooms.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.owner_name?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRooms = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const panelProps = {
    active, owner, messages, msgProfiles, participantProfiles,
    tab, setTab, input, setInput, send,
    menuMsg, setMenuMsg, setConfirm, setConfirmAll,
    exportMessages, copyRoomNo,
    roomNo: active ? (roomNoMap[active.id] || '') : '',
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold">Oda Mesajları</h1>
        <p className="text-sm text-muted-foreground">Odaları seçerek mesaj geçmişlerini görüntüleyin ve yönetin.</p>
      </div>

      {/* Layout */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-4 lg:h-[calc(100vh-200px)]">
        {/* Room List */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col min-h-0 max-h-[70vh] lg:max-h-none">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Oda ara..." className="w-full bg-secondary/60 rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {/* Room cards */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 overscroll-contain">
            {pagedRooms.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Oda yok.</p>}
            {pagedRooms.map((r) => (
              <button key={r.id} onClick={() => selectRoom(r)} className={`w-full text-left p-3 rounded-xl border transition-colors ${active?.id === r.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                <div className="flex items-center gap-2.5">
                  {roomOwners[r.owner_id]?.avatar ? (
                    <Image src={roomOwners[r.owner_id].avatar} className="w-9 h-9 rounded-full object-cover shrink-0" fittingType="fill" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold shrink-0">{(r.owner_name || '?')[0]}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{roomNoMap[r.id]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.owner_name || 'Oda Sahibi yok'}</p>
                  </div>
                  {unread[r.id] > 0 && (
                    <span className="shrink-0 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">{unread[r.id]}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="inline-flex items-center gap-1 text-xs"><span className={`w-2 h-2 rounded-full ${r.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} /> {r.status === 'active' ? 'Aktif' : 'Kapalı'}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {r.participants?.length || 0}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {roomMsgCounts[r.id] || 0}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => {
                if (i === 0 || i === totalPages - 1 || Math.abs(i + 1 - page) <= 1) return <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-full text-xs font-medium border ${page === i + 1 ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-secondary'}`}>{i + 1}</button>;
                if (Math.abs(i + 1 - page) === 2) return <span key={i} className="px-1 text-muted-foreground text-xs">...</span>;
                return null;
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Desktop Message Panel */}
        <div className="hidden lg:flex bg-card border border-border rounded-2xl flex-col min-h-0 overflow-hidden">
          <RoomMessagePanel {...panelProps} isMobile={false} scrollRef={desktopScrollRef} />
        </div>
      </div>

      {/* Mobile Slide-in Panel */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${panelOpen && active ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={closePanel} />
        <div className={`absolute top-0 right-0 w-full max-w-[400px] h-[100dvh] bg-card flex flex-col pt-[max(env(safe-area-inset-top),1rem)] transition-transform duration-300 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {active && <RoomMessagePanel {...panelProps} isMobile={true} onClose={closePanel} scrollRef={mobileScrollRef} />}
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Mesajı sil?" onConfirm={del} />
      <ConfirmDialog open={confirmAll} onOpenChange={(o) => !o && setConfirmAll(false)} title="Tüm mesajları sil?" description="Bu odadaki tüm mesajlar kalıcı olarak silinecek." confirmText="Tümünü Sil" onConfirm={delAll} />
    </div>
  );
}