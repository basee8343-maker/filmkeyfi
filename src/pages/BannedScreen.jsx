import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function BannedScreen() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then((u) => { setUser(u); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!user || !user.is_banned) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6 text-4xl">
          🚫
        </div>
        <h1 className="text-2xl font-extrabold mb-3">HESABINIZ ENGELLENDİ</h1>
        <p className="text-muted-foreground mb-6">Yönetici tarafından hesabınız engellenmiştir.</p>

        {user.ban_reason && (
          <div className="bg-card border border-border rounded-xl p-4 mb-3 text-left">
            <p className="text-xs text-muted-foreground mb-1">Engel nedeni:</p>
            <p className="font-semibold">{user.ban_reason}</p>
          </div>
        )}

        {user.ban_description && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-muted-foreground mb-1">Açıklama:</p>
            <p className="text-sm">{user.ban_description}</p>
          </div>
        )}

        {!user.ban_reason && !user.ban_description && <div className="mb-6" />}

        <button onClick={handleLogout} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold">
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}