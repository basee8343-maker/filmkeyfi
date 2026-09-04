import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Users, Lock, MessageSquare, Mic, DoorOpen, Check, Home, Settings, Eye, EyeOff, Minus, Plus, Video } from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState({ name: '', movie_id: '', password: '', max_users: 10, chat_enabled: true, voice_enabled: false, hidden: false });
  const [nameEdited, setNameEdited] = useState(false);
  const [showPass, setShowPass] = useState(false);

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

  const openMyRoom = async () => {
    try {
      const res = await base44.functions.invoke('personal-room', {});
      navigate(`/oda/${res.data.id}`);
    } catch (e) {
      toast({ title: 'Oda açılamadı', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const inputCls = "w-full bg-[#16161e] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/40 border border-white/5 placeholder:text-gray-500";

  const toggleCards = [
    { key: 'chat_enabled', icon: MessageSquare, label: 'Sohbet açık' },
    { key: 'voice_enabled', icon: Mic, label: 'Sesli sohbet' },
    { key: 'hidden', icon: Lock, label: 'Gizli oda' },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto text-white">
      {/* Hero Panel */}
      <div className="relative rounded-2xl overflow-hidden mb-6 p-5" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(219,39,119,0.08))', border: '1px solid rgba(168,85,247,0.2)' }}>
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-2xl opacity-30" style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
        <div className="relative flex items-center gap-4">
          <span className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.2)' }}>
            <Users className="w-6 h-6 text-purple-400" />
          </span>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold">Oda Kur</h1>
            <p className="text-sm text-gray-400">Arkadaşlarınla birlikte izlemek için bir Watch Party odası oluştur.</p>
          </div>
        </div>
        <button onClick={openMyRoom} className="relative mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>
          <Home className="w-5 h-5" /> Kendi Odamı Aç
        </button>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Oda Adı */}
        <div>
          <label className="text-sm font-medium block mb-1.5 text-gray-300">Oda Adı</label>
          <div className="relative">
            <input className={inputCls + ' pr-10'} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setNameEdited(true); }} placeholder="Örn: Cuma Gecesi Sineması" required />
            <Settings className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* Film Seç */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-300">Film / Dizi Seç</label>
            <Link to="/filmler" className="text-xs text-purple-400 hover:underline">Tümünü Gör →</Link>
          </div>
          {movies.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center bg-[#16161e] rounded-xl">Yüklü içerik yok.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar p-1 -m-1">
              {movies.map((m) => (
                <button key={m.id} type="button" onClick={() => setForm({ ...form, movie_id: m.id, name: nameEdited ? form.name : m.title })}
                  className={`relative shrink-0 w-28 rounded-xl overflow-hidden border-2 transition-all ${form.movie_id === m.id ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-transparent hover:border-white/10'}`}>
                  <Image src={m.poster || m.backdrop} alt={m.title} className="aspect-[2/3] w-full" fittingType="fill" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                    <p className="text-xs font-medium text-white line-clamp-2">{m.title}</p>
                  </div>
                  {form.movie_id === m.id && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1.5 text-gray-300">Şifre (opsiyonel)</label>
            <div className="relative">
              <input className={inputCls + ' pr-10'} type={showPass ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Boş = şifresiz" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
            <button type="button" onClick={() => setForm({ ...form, password: Math.random().toString(36).slice(2, 8).toUpperCase() })} className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-purple-500/40 text-purple-400 hover:bg-purple-500/10">Oluştur</button>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5 text-gray-300">Maks. Kullanıcı</label>
            <div className="flex items-center gap-2 bg-[#16161e] rounded-xl border border-white/5 px-2 py-2">
              <button type="button" onClick={() => setForm({ ...form, max_users: Math.max(2, Number(form.max_users) - 1) })} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-300 hover:bg-white/10"><Minus className="w-4 h-4" /></button>
              <span className="flex-1 text-center text-sm font-bold">{form.max_users}</span>
              <button type="button" onClick={() => setForm({ ...form, max_users: Math.min(250, Number(form.max_users) + 1) })} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-300 hover:bg-white/10"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {Number(form.max_users) > 100 && <p className="text-xs text-amber-500 -mt-1">⚠️ Yüksek kapasite: çok sayıda katılımcı oda performansını etkileyebilir.</p>}

        {/* Toggle Cards */}
        <div className="grid grid-cols-3 gap-2">
          {toggleCards.map(({ key, icon: Icon, label }) => {
            const active = form[key];
            return (
              <button key={key} type="button" onClick={() => setForm({ ...form, [key]: !active })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${active ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-[#16161e]'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${active ? 'bg-purple-500' : 'border border-white/20'}`}>
                  {active && <Check className="w-3 h-3 text-white" />}
                </span>
                <Icon className={`w-5 h-5 ${active ? 'text-purple-400' : 'text-gray-500'}`} />
                <span className={`text-xs font-medium text-center ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Submit */}
        <button type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #e11d48, #7c3aed)' }}>
          <Video className="w-5 h-5" /> Odayı Oluştur
        </button>
      </form>
    </div>
  );
}