import { useState } from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LocationSharing({ user }) {
  const { toast } = useToast();
  const [shared, setShared] = useState(() => !!localStorage.getItem('filmkeyfi_gps_' + user.id));
  const [loading, setLoading] = useState(false);

  const enable = () => {
    if (!navigator.geolocation) { toast({ title: 'Cihazınız konum desteklemiyor', variant: 'destructive' }); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const data = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        localStorage.setItem('filmkeyfi_gps_' + user.id, JSON.stringify(data));
        setShared(true); setLoading(false);
        toast({ title: 'Konum paylaşımı açıldı', description: 'Yaklaşık konumunuz yalnızca yönetici paneline iletiliyor.' });
      },
      () => { setLoading(false); toast({ title: 'Konum izni reddedildi', description: 'GPS verisi alınmadı.', variant: 'destructive' }); },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  };
  const disable = () => {
    localStorage.removeItem('filmkeyfi_gps_' + user.id);
    setShared(false);
    toast({ title: 'Konum paylaşımı kapatıldı' });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="flex items-center gap-2 font-bold"><MapPin className="w-5 h-5" />Konum Paylaşımı</h2>
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <p>Konum verisi hassastır. Yalnızca açıkça izin verirseniz tarayıcının GPS bilgisi alınır ve yalnızca yönetici panelinde gösterilir. İzin vermezseniz hiçbir GPS verisi toplanmaz; yalnızca IP tabanlı yaklaşık konum kullanılır. İstediğiniz an kapatabilirsiniz.</p>
      </div>
      {shared ? (
        <button onClick={disable} className="rounded-lg bg-amber-500/20 text-amber-400 px-4 py-2.5 text-sm font-semibold">Konum Paylaşımını Kapat</button>
      ) : (
        <button onClick={enable} disabled={loading} className="rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{loading ? 'Konum alınıyor...' : 'Konumumu Paylaş'}</button>
      )}
    </section>
  );
}