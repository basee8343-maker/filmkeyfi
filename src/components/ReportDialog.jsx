import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Flag, X } from 'lucide-react';

const REASONS = ['Spam', 'Taciz / Hakaret', 'Uygunsuz İçerik', 'Sahte Profil', 'Tehdit', 'Diğer'];

export default function ReportDialog({ targetId, targetName, context, contextId, onClose }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!user || !targetId) return;
    setSending(true);
    try {
      await base44.entities.Report.create({
        reporter_id: user.id,
        reporter_name: user.username || user.full_name || 'Kullanıcı',
        target_id: targetId,
        target_name: targetName || '',
        context,
        context_id: contextId || '',
        reason: `${reason}${detail ? ' — ' + detail : ''}`,
      });
      toast({ title: 'Şikayetiniz alındı', description: 'İnceleyeceğiz.' });
      onClose();
    } catch { toast({ title: 'Gönderilemedi', variant: 'destructive' }); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><Flag className="w-5 h-5 text-destructive" /> Şikayet Et</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-3"><b>{targetName}</b> kullanıcısını şikayet ediyorsunuz</p>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm mb-2 outline-none">
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Açıklama (opsiyonel)" rows={2} className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={submit} disabled={sending} className="w-full bg-destructive text-destructive-foreground py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">{sending ? 'Gönderiliyor...' : 'Şikayet Gönder'}</button>
      </div>
    </div>
  );
}