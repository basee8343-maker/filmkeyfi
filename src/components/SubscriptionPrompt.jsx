import { useNavigate } from 'react-router-dom';
import { CreditCard, Clock } from 'lucide-react';

export default function SubscriptionPrompt({ onSubscribe }) {
  const navigate = useNavigate();
  const go = () => { if (onSubscribe) onSubscribe(); else navigate('/abonelik'); };
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/15 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">Aboneliğiniz Sona Erdi</h1>
        <p className="text-sm text-muted-foreground mb-6">Aboneliğinizi yenileyerek filmleri izlemeye devam edebilirsiniz.</p>
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 rounded-xl p-4 mb-6">
          <p className="font-bold text-lg">1 Aylık Abonelik</p>
          <p className="text-sm text-muted-foreground">30 Gün · Tüm içeriklere erişim</p>
          <p className="text-3xl font-extrabold text-gradient mt-1">50 ₺</p>
        </div>
        <button onClick={go} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold flex items-center justify-center gap-2">
          <CreditCard className="w-5 h-5" /> TEKRAR ABONE OL
        </button>
      </div>
    </div>
  );
}