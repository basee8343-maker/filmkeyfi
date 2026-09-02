import { RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MembershipNotice({ user, expired, onRenew }) {
  if (user.role === 'admin') return null;
  if (user.membership_status === 'pending') return <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300"><span>Aboneliğinizi aktif etmek için ödeme yapın.</span><Link to="/abonelik" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">Abonelik Seç</Link></div>;
  if (expired) return <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><span>Üyeliğinizin süresi doldu.</span><button onClick={onRenew} className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"><RefreshCw className="w-4 h-4" />Üyeliği Yenile</button></div>;
  return null;
}