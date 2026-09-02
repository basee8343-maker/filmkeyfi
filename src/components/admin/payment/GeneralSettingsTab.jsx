import { useEffect, useState } from 'react';
export default function GeneralSettingsTab({ value, onSave }) {
  const [form, setForm] = useState(value || {}); useEffect(() => setForm(value || {}), [value]);
  const input='w-full bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm';
  return <form onSubmit={(e)=>{e.preventDefault();onSave(form)}} className="bg-card border border-border rounded-xl p-5 space-y-5 max-w-4xl">
    <div><h2 className="text-lg font-bold">Genel Ödeme Ayarları</h2><p className="text-sm text-muted-foreground">Ödeme altyapısının genel davranışını yönetin.</p></div>
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="text-sm font-medium">Varsayılan Ödeme Yöntemi<select className={`${input} mt-1`} value={form.default_provider||'shopier'} onChange={e=>setForm({...form,default_provider:e.target.value})}><option value="shopier">Shopier</option><option value="paytr">PayTR</option><option value="iyzico">iyzico</option><option value="stripe">Stripe</option></select></label>
      <label className="text-sm font-medium">Ödeme Zaman Aşımı (dakika)<input className={`${input} mt-1`} type="number" min="5" value={form.timeout||30} onChange={e=>setForm({...form,timeout:Number(e.target.value)})}/></label>
      <label className="text-sm font-medium">Sipariş Numarası Öneki<input className={`${input} mt-1`} value={form.order_prefix||'FK'} onChange={e=>setForm({...form,order_prefix:e.target.value})}/></label>
      <label className="text-sm font-medium">Minimum Ödeme Tutarı<input className={`${input} mt-1`} type="number" min="0" value={form.minimum_amount||1} onChange={e=>setForm({...form,minimum_amount:Number(e.target.value)})}/></label>
    </div>
    {[['email_receipt','Ödeme sonrası e-posta makbuzu gönder'],['retry_failed','Başarısız ödemeyi yeniden denemeye izin ver'],['save_payment_logs','Ödeme işlem kayıtlarını sakla']].map(([k,t])=><label key={k} className="flex items-center justify-between border border-border rounded-lg p-3 text-sm"><span>{t}</span><input type="checkbox" checked={form[k]??true} onChange={e=>setForm({...form,[k]:e.target.checked})}/></label>)}
    <button className="bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm font-semibold">Genel Ayarları Kaydet</button>
  </form>;
}