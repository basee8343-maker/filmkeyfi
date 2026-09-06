import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Trash2, CheckCheck, ChevronRight } from 'lucide-react';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';

export default function AdminNotifBell({ notifGranted }) {
  const { notifications, unreadCount, markAllRead, deleteAll } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-lg hover:bg-white/5 relative" title="Bildirimler">
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        {notifGranted && unreadCount === 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden z-50" style={{ background: 'rgba(18,18,21,0.98)', border: '1px solid rgba(174,184,196,0.15)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 60px -15px rgba(0,0,0,0.8)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-sm font-bold text-white">Bildirimler</p>
            <div className="flex gap-1">
              <button onClick={markAllRead} title="Tümünü okundu işaretle" className="p-1.5 rounded-lg hover:bg-white/5"><CheckCheck className="w-4 h-4 text-white/60" /></button>
              <button onClick={deleteAll} title="Tümünü sil" className="p-1.5 rounded-lg hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-red-400" /></button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-xs text-white/40">Bildirim yok</p>
            ) : notifications.slice(0, 20).map((n) => (
              <div key={n.id} className={`px-4 py-2.5 border-b border-white/5 ${n.read ? '' : 'bg-purple-500/5'}`}>
                <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                {n.body && <p className="text-[11px] text-white/50 truncate">{n.body}</p>}
              </div>
            ))}
          </div>
          <button onClick={() => { setOpen(false); navigate('/admin/bildirimler'); }} className="w-full flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold text-purple-400 hover:bg-white/5 border-t border-white/10">
            Tüm Bildirimler <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}