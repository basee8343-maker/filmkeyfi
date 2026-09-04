import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'filmkeyfi_last_seen_update';

export default function WhatsNewModal() {
  const [announcement, setAnnouncement] = useState(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const items = await base44.entities.UpdateAnnouncement.filter({ active: true }, '-created_date', 1);
        if (!active || !items.length) return;
        const latest = items[0];
        const lastSeen = localStorage.getItem(STORAGE_KEY) || '';
        if (latest.created_date && latest.created_date > lastSeen) {
          setAnnouncement(latest);
        }
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  const dismiss = () => {
    if (!announcement) return;
    localStorage.setItem(STORAGE_KEY, announcement.created_date || new Date().toISOString());
    setLeaving(true);
    setTimeout(() => setAnnouncement(null), 250);
  };

  if (!announcement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className={`relative w-full max-w-md rounded-2xl overflow-hidden ${leaving ? 'opacity-0' : 'opacity-100'} transition-opacity duration-250`}
        style={{ background: 'linear-gradient(160deg, #1a1c22 0%, #23252b 100%)', border: '1px solid rgba(139,49,255,0.3)', boxShadow: '0 20px 60px -15px rgba(139,49,255,0.4)' }}>
        {/* Glow header */}
        <div className="relative px-6 pt-6 pb-4 text-center" style={{ background: 'linear-gradient(180deg, rgba(139,49,255,0.15) 0%, transparent 100%)' }}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3" style={{ background: 'linear-gradient(135deg, #8B31FF, #5F24A1)', boxShadow: '0 0 24px rgba(139,49,255,0.5)' }}>
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          {announcement.version && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2" style={{ background: 'rgba(139,49,255,0.2)', color: '#c4b5fd' }}>
              Sürüm {announcement.version}
            </span>
          )}
          <h2 className="text-xl font-extrabold text-white">{announcement.title}</h2>
          <p className="text-xs text-white/40 mt-1">{new Date(announcement.created_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[45vh] overflow-y-auto">
          <div className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{announcement.body}</div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <button onClick={dismiss}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-transform active:scale-95"
            style={{ background: 'linear-gradient(135deg, #8B31FF, #5F24A1)', boxShadow: '0 4px 20px rgba(139,49,255,0.4)' }}>
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}