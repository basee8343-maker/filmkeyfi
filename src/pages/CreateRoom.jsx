import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Users, Lock, MessageSquare, Mic, DoorOpen, Check } from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState({ name: '', movie_id: '', password: '', max_users: 10, chat_enabled: true, voice_enabled: false, hidden: false });

  useEffect(() => {
    base44.entities.Movie.filter({ published: true }, '-views', 100).then(setMovies).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.movie_id) { toast({ title: 'Oda adı ve içerik seçin', variant: 'destructive' }); return; }
    const movie = movies.find((m) => m.id === form.movie_id);
    try {
      const res = await base44.functions.invoke('create-room', {
        name: form.name, movie_id: form.movie_id, movie_title: movie?.title || '',
        password: form.password, max_users: Number(form.max_users),
        chat_enabled: form.chat_enabled, voice_enabled: form.voice_enabled, hidden: form.hidden
      });
      toast({ title: 'Oda oluşturuldu' });
      navigate(`/oda/${res.data.id}`);
    } catch (err) { toast({ title: 'Hata', description: err.response?.data?.error || err.message, variant: 'destructive' }); }
  };

  const field = "w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring border border-border";

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Oda Kur</h1>
        <Link to="/acik-odalar" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><DoorOpen className="w-4 h-4" /> Açık Odalar</Link>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Arkadaşlarınla birlikte izlemek için bir Watch Party odası oluştur.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Oda Adı</label>
          <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn: Cuma Gecesi Sineması" required />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5">Film / Dizi Seç</label>
          {movies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Yüklü içerik yok.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar p-1 -m-1">
              {movies.map((m) => (
                <button key={m.id} type="button" onClick={() => setForm({ ...form, movie_id: m.id })}
                  className={`relative shrink-0 w-28 rounded-lg overflow-hidden border-2 transition-all ${form.movie_id === m.id ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-border'}`}>
                  <Image src={m.poster || m.backdrop} alt={m.title} className="aspect-[2/3] w-full" fittingType="fill" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                    <p className="text-xs font-medium text-white line-clamp-2">{m.title}</p>
                  </div>
                  {form.movie_id === m.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1.5 flex items-center gap-1"><Lock className="w-4 h-4" /> Şifre (opsiyonel)</label>
            <div className="flex gap-2">
              <input className={field} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Boş = şifresiz" />
              <button type="button" onClick={() => setForm({ ...form, password: Math.random().toString(36).slice(2, 8).toUpperCase() })} className="shrink-0 px-3 rounded-lg bg-secondary border border-border text-sm font-medium hover:bg-secondary/70">Oluştur</button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Maks. Kullanıcı</label>
            <input className={field} type="number" min={2} max={250} value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} />
          </div>
        </div>
        {Number(form.max_users) > 100 && <p className="text-xs text-amber-500 -mt-1 flex items-center gap-1">⚠️ Yüksek kapasite: çok sayıda katılımcı oda performansını etkileyebilir.</p>}
        <div className="flex gap-3">
          <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${form.chat_enabled ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40'}`}>
            <input type="checkbox" checked={form.chat_enabled} onChange={(e) => setForm({ ...form, chat_enabled: e.target.checked })} className="accent-primary" />
            <MessageSquare className="w-4 h-4" /> <span className="text-sm">Sohbet açık</span>
          </label>
          <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${form.voice_enabled ? 'border-accent bg-accent/10' : 'border-border bg-secondary/40'}`}>
            <input type="checkbox" checked={form.voice_enabled} onChange={(e) => setForm({ ...form, voice_enabled: e.target.checked })} className="accent-accent" />
            <Mic className="w-4 h-4" /> <span className="text-sm">Sesli sohbet</span>
          </label>
          <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${form.hidden ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-secondary/40'}`}>
            <input type="checkbox" checked={form.hidden} onChange={(e) => setForm({ ...form, hidden: e.target.checked })} className="accent-amber-500" />
            <Lock className="w-4 h-4" /> <span className="text-sm">Gizli oda</span>
          </label>
        </div>
        <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg">Odayı Oluştur</button>
      </form>
    </div>
  );
}