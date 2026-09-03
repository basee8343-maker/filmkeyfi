import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import { X, Check, Trash2 } from 'lucide-react';

export default function FramePickerModal({ user, onClose, onUpdated }) {
  const { toast } = useToast();
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [entryEnabled, setEntryEnabled] = useState(true);
  const [exitEnabled, setExitEnabled] = useState(true);

  useEffect(() => {
    base44.entities.SpecialFrame.filter({ active: true }, 'name', 100)
      .then(setFrames)
      .catch(() => toast({ title: 'Çerçeveler yüklenemedi', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  // Mevcut atanan çerçeveyi göster
  const currentFrameId = user?.special_frame_id || '';

  const assignFrame = async (frame) => {
    setAssigning(frame.id);
    try {
      await base44.functions.invoke('role-management', {
        action: 'assign_special_frame',
        user_id: user.id,
        frame_id: frame.id,
        entry_enabled: entryEnabled,
        exit_enabled: exitEnabled,
      });
      toast({ title: 'Çerçeve atandı', description: `${frame.name} → ${user.username || user.full_name}` });
      onUpdated?.();
      onClose();
    } catch (e) {
      toast({ title: 'Atanamadı', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setAssigning(null);
  };

  const removeFrame = async () => {
    setAssigning('remove');
    try {
      await base44.functions.invoke('role-management', {
        action: 'assign_special_frame',
        user_id: user.id,
        frame_id: '',
      });
      toast({ title: 'Çerçeve kaldırıldı' });
      onUpdated?.();
      onClose();
    } catch (e) {
      toast({ title: 'Kaldırılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setAssigning(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">Özel Çerçeve Ata</h2>
            <p className="text-xs text-muted-foreground">{user?.username || user?.full_name || user?.email}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
        </div>

        {currentFrameId && (
          <button onClick={removeFrame} disabled={assigning === 'remove'} className="w-full mb-4 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> {assigning === 'remove' ? 'Kaldırılıyor...' : 'Mevcut Çerçeveyi Kaldır'}
          </button>
        )}

        <div className="flex items-center gap-4 mb-4 p-3 bg-secondary/50 rounded-lg">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={entryEnabled} onChange={(e) => setEntryEnabled(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span>Giriş animasyonu</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={exitEnabled} onChange={(e) => setExitEnabled(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span>Çıkış animasyonu</span>
          </label>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8">Çerçeveler yükleniyor...</p>
        ) : frames.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Aktif çerçeve yok.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {frames.map((frame) => {
              const isSelected = currentFrameId === frame.id;
              return (
                <button
                  key={frame.id}
                  onClick={() => assignFrame(frame)}
                  disabled={!!assigning}
                  className={`relative rounded-xl border-2 p-2 flex flex-col items-center gap-1.5 transition active:scale-95 disabled:opacity-50 ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-secondary/50 hover:border-primary/50'}`}
                >
                  {isSelected && <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="w-3 h-3" /></span>}
                  <div className="relative w-20 h-20">
                    <Image src={frame.image_url} className="w-full h-full" fittingType="fit" />
                  </div>
                  <p className="text-xs font-semibold text-center truncate w-full" style={{ color: frame.theme_color }}>{frame.name}</p>
                  <p className="text-[10px] text-muted-foreground text-center truncate w-full">{frame.title}</p>
                  <div className="flex gap-1">
                    <span className="w-3 h-3 rounded-full border border-border" style={{ background: frame.theme_color }} />
                    <span className="w-3 h-3 rounded-full border border-border" style={{ background: frame.text_color }} />
                    <span className="w-3 h-3 rounded-full border border-border" style={{ background: frame.glow_color }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-4 text-center">Çerçeve atandığında kullanıcı odaya girerken/çıkarken bu çerçeve görünür.</p>
      </div>
    </div>
  );
}