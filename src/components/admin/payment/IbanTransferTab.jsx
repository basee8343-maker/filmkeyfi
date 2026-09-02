import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Landmark, Save } from 'lucide-react';

export default function IbanTransferTab() {
  const { toast } = useToast();
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [methodId, setMethodId] = useState(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    base44.entities.PaymentMethod.filter({ provider: 'iban' }, '-created_date', 5).then((items) => {
      if (items.length) {
        const m = items[0];
        setMethodId(m.id);
        setEnabled(m.enabled);
        try { const data = JSON.parse(m.description || '{}'); setIban(data.iban || ''); setBankName(data.bank_name || ''); setAccountHolder(data.account_holder || ''); } catch {}
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const description = JSON.stringify({ iban, bank_name: bankName, account_holder: accountHolder });
      if (methodId) {
        await base44.entities.PaymentMethod.update(methodId, { display_name: 'IBAN Transfer', description, enabled });
      } else {
        const m = await base44.entities.PaymentMethod.create({ provider: 'iban', display_name: 'IBAN Transfer', description, enabled, sort_order: 99 });
        setMethodId(m.id);
      }
      toast({ title: 'IBAN bilgileri kaydedildi' });
    } catch { toast({ title: 'Kaydedilemedi', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-lg">
      <h3 className="font-bold flex items-center gap-2 mb-2"><Landmark className="w-5 h-5 text-primary" /> IBAN Transfer Ayarları</h3>
      <p className="text-sm text-muted-foreground mb-4">Üyeler ödeme sayfasında IBAN bilgilerinizi görür, parayı gönderdikten sonra "Parayı Gönderdim" butonuna basar. Siz ödeme geçmişinden onaylarsınız.</p>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Banka Adı</label>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Örn: Ziraat Bankası" className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-sm font-medium">IBAN</label>
          <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-ring font-mono" />
        </div>
        <div>
          <label className="text-sm font-medium">Hesap Sahibi</label>
          <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Ad Soyad" className="w-full bg-secondary/60 rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm font-medium">Üyelere göster</span>
        </label>
        <button onClick={save} disabled={saving} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
      </div>
    </div>
  );
}