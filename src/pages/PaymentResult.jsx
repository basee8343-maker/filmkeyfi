import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

export default function PaymentResult() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reason = params.get('reason');
  const isFail = window.location.pathname.includes('basarisiz');
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const me = await base44.auth.me();
        if (isFail) {
          setStatus('fail');
          setMessage(reason === 'invalid_signature' ? 'Ödeme doğrulanamadı.' : 'Ödeme başarısız oldu.');
          return;
        }
        // Başarı — webhook'un işlemesi için bekleme (15 deneme × 1.5sn = ~22sn)
        let attempts = 0;
        const checkActive = async () => {
          const u = await base44.auth.me();
          if (u.membership_status === 'active' || u.role === 'admin' || u.role === 'moderator') {
            setStatus('success');
            setPlan(u.subscription_plan || '');
            return;
          }
          if (attempts++ < 20) setTimeout(checkActive, 1500);
          else setStatus('processing');
        };
        checkActive();
      } catch {
        setStatus(isFail ? 'fail' : 'success');
      }
    };
    verify();
  }, []);

  // Başarılı ödeme sonrası otomatik ana sayfaya yönlendir
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => navigate('/'), 2500);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <h1 className="text-xl font-bold mb-1">Ödemeniz kontrol ediliyor</h1>
          <p className="text-sm text-muted-foreground">Aboneliğiniz aktif ediliyor, lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center bg-card border border-border rounded-2xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/15 flex items-center justify-center"><Loader2 className="w-9 h-9 text-amber-500 animate-spin" /></div>
          <h1 className="text-2xl font-extrabold mb-2">Ödemeniz Alındı</h1>
          <p className="text-sm text-muted-foreground mb-6">Aboneliğiniz henüz işlenmedi. Birkaç dakika içinde otomatik olarak aktif edilecektir. Bu sayfayı kapatıp daha sonra geri dönebilirsiniz.</p>
          <button onClick={() => navigate('/')} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold">Ana Sayfaya Dön</button>
          <button onClick={() => window.location.reload()} className="w-full mt-2 text-sm text-muted-foreground py-2 flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> Tekrar Kontrol Et</button>
        </div>
      </div>
    );
  }

  if (status === 'fail') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center bg-card border border-border rounded-2xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/15 flex items-center justify-center"><XCircle className="w-9 h-9 text-red-500" /></div>
          <h1 className="text-2xl font-extrabold mb-2">Ödeme Başarısız</h1>
          <p className="text-sm text-muted-foreground mb-6">{message || 'Ödeme işlemi tamamlanamadı.'}</p>
          <button onClick={() => navigate('/abonelik')} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> Tekrar Ödeme Yap</button>
          <button onClick={() => navigate('/')} className="w-full mt-2 text-sm text-muted-foreground py-2">Ana Sayfaya Dön</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full text-center bg-card border border-border rounded-2xl p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/15 flex items-center justify-center"><CheckCircle className="w-9 h-9 text-green-500" /></div>
        <h1 className="text-2xl font-extrabold mb-2">Aboneliğiniz Aktif Edildi! 🎉</h1>
        <p className="text-sm text-muted-foreground mb-2">{plan ? `${plan} aboneliğiniz aktif edildi.` : 'Aboneliğiniz aktif edildi.'}</p>
        <p className="text-xs text-muted-foreground mb-6">Ana sayfaya yönlendiriliyorsunuz...</p>
        <button onClick={() => navigate('/')} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold">Filmlere Göz At</button>
      </div>
    </div>
  );
}