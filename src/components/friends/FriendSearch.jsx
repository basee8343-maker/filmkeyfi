import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';

export default function FriendSearch({ invoke }) {
  const [memberId, setMemberId] = useState(''); const [result, setResult] = useState(null);
  const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  const search = async (e) => { e.preventDefault(); setBusy(true); setStatus('');
    try { const data = await invoke({ action: 'search', member_id: memberId }); setResult(data.user); if (!data.user) setStatus('Kullanıcı bulunamadı.'); }
    catch (e) { setStatus(e.response?.data?.error || e.message); } finally { setBusy(false); }
  };
  const add = async () => { setBusy(true); try { await invoke({ action: 'request', user_id: result.id }); setStatus('Arkadaşlık isteği gönderildi.'); setResult(null); }
    catch (e) { setStatus(e.response?.data?.error || e.message); } finally { setBusy(false); } };
  return <section className="bg-card border border-border rounded-xl p-4">
    <h2 className="font-bold mb-3">Üye No ile Arkadaş Bul</h2>
    <form onSubmit={search} className="flex gap-2"><input value={memberId} onChange={(e) => setMemberId(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="8 haneli üye numarası" className="flex-1 min-w-0 bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><button disabled={busy || memberId.length !== 8} className="bg-primary text-primary-foreground rounded-lg px-3 disabled:opacity-50"><Search className="w-4 h-4" /></button></form>
    {result && <div className="mt-3 flex items-center gap-3 bg-secondary/60 rounded-lg p-3"><div className="flex-1"><p className="font-semibold text-sm">{result.name}</p><p className="text-xs text-muted-foreground">Üye No: {result.member_id}</p></div><button onClick={add} disabled={busy} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold"><UserPlus className="w-4 h-4" /> İstek Gönder</button></div>}
    {status && <p className="mt-2 text-xs text-muted-foreground">{status}</p>}
  </section>;
}