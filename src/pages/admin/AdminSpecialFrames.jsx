import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import { X, Search, Upload, Trash2, Edit, Check, UserPlus } from 'lucide-react';

const btn = 'px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95';

export default function AdminSpecialFrames() {
  const { toast } = useToast();
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingFrame, setEditingFrame] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formTheme, setFormTheme] = useState('#ff4500');
  const [formText, setFormText] = useState('#ffaa00');
  const [formGlow, setFormGlow] = useState('#ff4500');
  const [formTitle, setFormTitle] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Assignment state
  const [assignFrameId, setAssignFrameId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignEntry, setAssignEntry] = useState(true);
  const [assignExit, setAssignExit] = useState(true);

  const loadFrames = useCallback(() => {
    base44.entities.SpecialFrame.list('-created_date', 200).then((f) => {
      setFrames(f);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadUsers = useCallback(() => {
    base44.entities.User.list('-created_date', 500).then((u) => {
      setUsers(u);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadFrames();
    loadUsers();
    const unsub = base44.entities.SpecialFrame.subscribe(() => loadFrames());
    return unsub;
  }, [loadFrames]);

  const filteredUsers = users.filter((u) => {
    if (!userQuery.trim()) return true;
    const q = userQuery.trim().toLowerCase();
    return (u.username || '').toLowerCase().includes(q) ||
           (u.full_name || '').toLowerCase().includes(q) ||
           (u.email || '').toLowerCase().includes(q) ||
           (u.member_id || '').includes(q);
  });

  const openNewFrame = () => {
    setEditingFrame(null);
    setFormName(''); setFormImage(''); setFormTheme('#ff4500');
    setFormText('#ffaa00'); setFormGlow('#ff4500'); setFormTitle('');
    setFormActive(true);
    setShowForm(true);
  };

  const openEditFrame = (frame) => {
    setEditingFrame(frame);
    setFormName(frame.name || ''); setFormImage(frame.image_url || '');
    setFormTheme(frame.theme_color || '#ff4500'); setFormText(frame.text_color || '#ffaa00');
    setFormGlow(frame.glow_color || '#ff4500'); setFormTitle(frame.title || '');
    setFormActive(frame.active !== false);
    setShowForm(true);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormImage(file_url);
      toast({ title: 'Görsel yüklendi' });
    } catch (e) {
      toast({ title: 'Yükleme başarısız', description: e.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const saveFrame = async () => {
    if (!formName.trim() || !formImage) {
      toast({ title: 'İsim ve görsel gerekli', variant: 'destructive' });
      return;
    }
    try {
      const data = {
        name: formName.trim(),
        image_url: formImage,
        theme_color: formTheme,
        text_color: formText,
        glow_color: formGlow,
        title: formTitle.trim(),
        active: formActive,
      };
      if (editingFrame) {
        await base44.entities.SpecialFrame.update(editingFrame.id, data);
        toast({ title: 'Çerçeve güncellendi' });
      } else {
        await base44.entities.SpecialFrame.create(data);
        toast({ title: 'Çerçeve eklendi' });
      }
      setShowForm(false);
      loadFrames();
    } catch (e) {
      toast({ title: 'Kayıt başarısız', description: e.message, variant: 'destructive' });
    }
  };

  const deleteFrame = async (frame) => {
    if (!confirm(`"${frame.name}" silinsin mi?`)) return;
    try {
      await base44.entities.SpecialFrame.delete(frame.id);
      toast({ title: 'Çerçeve silindi' });
      loadFrames();
    } catch (e) {
      toast({ title: 'Silinemedi', description: e.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (frame) => {
    try {
      await base44.entities.SpecialFrame.update(frame.id, { active: !frame.active });
      loadFrames();
    } catch (e) {
      toast({ title: 'Güncellenemedi', variant: 'destructive' });
    }
  };

  const selectUser = (u) => {
    setSelectedUser(u);
    setAssignFrameId(u.special_frame_id || '');
    setAssignTitle(u.special_frame_title || '');
    setAssignEntry(u.special_frame_entry !== false);
    setAssignExit(u.special_frame_exit !== false);
  };

  const assignFrame = async () => {
    if (!selectedUser) return;
    setAssigning(true);
    try {
      await base44.functions.invoke('role-management', {
        action: 'assign_special_frame',
        user_id: selectedUser.id,
        frame_id: assignFrameId || '',
        frame_title: assignTitle,
        entry_enabled: assignEntry,
        exit_enabled: assignExit,
      });
      toast({ title: 'Çerçeve anında atandı', description: selectedUser.username || selectedUser.full_name });
      loadUsers();
    } catch (e) {
      toast({ title: 'Atama başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setAssigning(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Özel Çerçeve / XMAN</h1>
          <p className="text-sm text-muted-foreground">Oda giriş/çıkış çerçeveleri ve unvan yönetimi</p>
        </div>
        <button onClick={openNewFrame} className={`${btn} bg-primary text-primary-foreground flex items-center gap-1.5`}>
          <Upload className="w-4 h-4" /> Yeni Çerçeve
        </button>
      </div>

      {/* ÇERÇEVE LİSTESİ */}
      <div>
        <h2 className="text-lg font-bold mb-3">Çerçeveler ({frames.length})</h2>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
        ) : frames.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
            Henüz çerçeve yok. "Yeni Çerçeve" ile ekleyin.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {frames.map((frame) => (
              <div key={frame.id} className={`bg-card border rounded-xl p-3 ${frame.active ? 'border-border' : 'border-border opacity-50'}`}>
                {/* Çerçeve önizleme */}
                <div className="relative aspect-square mb-2 flex items-center justify-center rounded-lg overflow-hidden"
                  style={{ background: `radial-gradient(ellipse at center, ${frame.theme_color}20, transparent 70%)` }}>
                  <div className="relative w-[80%] h-[80%]">
                    <div className="absolute inset-[20%] rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-2xl">
                      <span className="text-white/40">A</span>
                    </div>
                    <img src={frame.image_url} alt={frame.name} className="absolute inset-0 w-full h-full object-contain"
                      style={{ filter: `drop-shadow(0 0 8px ${frame.glow_color})` }} />
                  </div>
                </div>
                {/* Renk önizleme */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-full border border-border" style={{ background: frame.theme_color }} title="Tema" />
                  <div className="w-5 h-5 rounded-full border border-border" style={{ background: frame.text_color }} title="Yazı" />
                  <div className="w-5 h-5 rounded-full border border-border" style={{ background: frame.glow_color }} title="Glow" />
                  <span className="text-xs text-muted-foreground ml-1">Renkler</span>
                </div>
                <p className="font-bold text-sm truncate">{frame.name}</p>
                {frame.title && <p className="text-xs text-muted-foreground truncate">Unvan: {frame.title}</p>}
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <button onClick={() => toggleActive(frame)} className={`${btn} ${frame.active ? 'bg-green-600 text-white' : 'bg-secondary'}`}>
                    {frame.active ? 'Aktif' : 'Pasif'}
                  </button>
                  <button onClick={() => openEditFrame(frame)} className={`${btn} bg-secondary flex items-center gap-1`}>
                    <Edit className="w-3 h-3" /> Düzenle
                  </button>
                  <button onClick={() => deleteFrame(frame)} className={`${btn} bg-destructive text-destructive-foreground flex items-center gap-1`}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KULLANICI ATAMA */}
      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><UserPlus className="w-5 h-5" /> Kullanıcıya Çerçeve Ata</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Kullanıcı arama */}
          <div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="İsim, email veya ID ara..."
                className="w-full bg-secondary/60 rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {filteredUsers.slice(0, 50).map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition ${selectedUser?.id === u.id ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-secondary'}`}
                >
                  {u.avatar ? (
                    <Image src={u.avatar} className="w-8 h-8 rounded-full shrink-0" fittingType="fill" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold shrink-0">
                      {(u.username || u.full_name || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{u.username || u.full_name || 'İsimsiz'}</p>
                    <p className="text-xs opacity-60 truncate">{u.email}</p>
                  </div>
                  {u.special_frame_id && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Atama paneli */}
          <div className="bg-card border border-border rounded-xl p-4">
            {!selectedUser ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Soldan bir kullanıcı seçin
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  {selectedUser.avatar ? (
                    <Image src={selectedUser.avatar} className="w-10 h-10 rounded-full" fittingType="fill" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold">
                      {(selectedUser.username || selectedUser.full_name || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm">{selectedUser.username || selectedUser.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Çerçeve Seç</label>
                  <select
                    value={assignFrameId}
                    onChange={(e) => setAssignFrameId(e.target.value)}
                    className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Çerçeve yok</option>
                    {frames.filter((f) => f.active).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}{f.title ? ` (${f.title})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Özel Unvan (opsiyonel)</label>
                  <input
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="Çerçevenin varsayılan unvanı kullanılır"
                    className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={assignEntry} onChange={(e) => setAssignEntry(e.target.checked)} className="w-4 h-4" />
                    Giriş efekti
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={assignExit} onChange={(e) => setAssignExit(e.target.checked)} className="w-4 h-4" />
                    Çıkış efekti
                  </label>
                </div>

                <button
                  onClick={assignFrame}
                  disabled={assigning}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {assigning ? 'Atanıyor...' : 'Anında Ata'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ÇERÇEVE FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{editingFrame ? 'Çerçeveyi Düzenle' : 'Yeni Çerçeve'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-secondary rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Çerçeve Adı</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ateşli Çerçeve"
                  className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">PNG Görsel (transparent)</label>
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/png" onChange={(e) => handleUpload(e.target.files[0])} className="hidden" id="frame-upload" />
                  <label htmlFor="frame-upload" className={`${btn} bg-secondary flex items-center gap-1.5 cursor-pointer`}>
                    <Upload className="w-4 h-4" /> {uploading ? 'Yükleniyor...' : 'Yükle'}
                  </label>
                  {formImage && <span className="text-xs text-green-500 flex items-center gap-1"><Check className="w-3 h-3" /> Yüklendi</span>}
                </div>
                {formImage && (
                  <div className="mt-2 relative w-32 h-32 mx-auto rounded-lg overflow-hidden" style={{ background: 'repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 50% / 16px 16px' }}>
                    <img src={formImage} alt="" className="absolute inset-0 w-full h-full object-contain" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tema Rengi</label>
                  <input type="color" value={formTheme} onChange={(e) => setFormTheme(e.target.value)} className="w-full h-10 rounded-lg border border-border cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Yazı Rengi</label>
                  <input type="color" value={formText} onChange={(e) => setFormText(e.target.value)} className="w-full h-10 rounded-lg border border-border cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Glow Rengi</label>
                  <input type="color" value={formGlow} onChange={(e) => setFormGlow(e.target.value)} className="w-full h-10 rounded-lg border border-border cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Unvan (örn: ADMİN, KURUCU)</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="ADMİN"
                  className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="w-4 h-4" />
                Aktif
              </label>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-secondary py-2.5 rounded-lg text-sm font-semibold">İptal</button>
                <button onClick={saveFrame} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold">Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}