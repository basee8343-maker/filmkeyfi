import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Film, Loader2 } from 'lucide-react';

export default function MoviePickerSheet({ open, onClose, onSelect, currentMovieId }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    base44.entities.Movie.filter({ published: true }, '-views', 100)
      .then(setMovies).catch(() => {}).finally(() => setLoading(false));
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose(); }}
            className="fixed bottom-0 inset-x-0 z-[85] bg-card/95 backdrop-blur-xl border-t border-border rounded-t-2xl flex flex-col"
            style={{ height: '42vh' }}
          >
            <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 bg-muted-foreground/40 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 py-1.5 shrink-0">
              <h3 className="font-bold text-white flex items-center gap-2"><Film className="w-4 h-4 text-primary" /> Film Değiştir</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><ChevronDown className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-x-auto no-scrollbar px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> :
              !movies.length ? <p className="text-center text-sm text-muted-foreground py-8">Film bulunamadı.</p> :
              <div className="flex gap-3 h-full items-center">
                {movies.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { onSelect(m); onClose(); }}
                    className={`shrink-0 w-24 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${m.id === currentMovieId ? 'border-primary shadow-[0_0_12px_-2px_rgba(229,9,20,0.6)]' : 'border-transparent'}`}
                  >
                    <div className="w-24 h-32 relative">
                      {m.poster ? <Image src={m.poster} className="w-full h-full" fittingType="fill" /> : <div className="w-full h-full bg-secondary flex items-center justify-center text-xl font-bold">{(m.title || '?')[0]}</div>}
                    </div>
                    <div className="p-1.5 bg-card">
                      <p className="text-[11px] font-semibold truncate text-left">{m.title}</p>
                      {m.year && <p className="text-[9px] text-muted-foreground text-left">{m.year}</p>}
                    </div>
                  </button>
                ))}
              </div>}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}