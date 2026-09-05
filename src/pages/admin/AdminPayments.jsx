import { useState } from 'react';
import { CreditCard, Package, Inbox, History, Settings } from 'lucide-react';
import PaymentsDashboard from '@/components/admin/payments/PaymentsDashboard';
import PlansManager from '@/components/admin/payments/PlansManager';
import PaymentRequestsTab from '@/components/admin/payments/PaymentRequestsTab';
import PaymentHistoryTab from '@/components/admin/payments/PaymentHistoryTab';
import PaymentMethodsManager from '@/components/admin/payments/PaymentMethodsManager';
import SubscriptionExtensionTab from '@/components/admin/payments/SubscriptionExtensionTab';

const TABS = [
  { key: 'dashboard', label: 'Genel Bakış', icon: CreditCard },
  { key: 'plans', label: 'Paketler', icon: Package },
  { key: 'requests', label: 'Ödeme Talepleri', icon: Inbox },
  { key: 'history', label: 'Geçmiş', icon: History },
  { key: 'extension', label: 'Gün Uzatma' },
  { key: 'methods', label: 'Yöntemler', icon: Settings },
];

export default function AdminPayments() {
  const [tab, setTab] = useState('dashboard');
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Ödemeler & Abonelikler</h1>
      <p className="text-sm text-gray-400 mb-6">Ödeme ve abonelik yönetim sistemi</p>
      <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar bg-[#16161e] rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab === t.key ? 'text-white' : 'text-gray-400'}`}
              style={tab === t.key ? { background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' } : {}}>
              {Icon && <Icon className="w-4 h-4" />} {t.label}
            </button>
          );
        })}
      </div>
      {tab === 'dashboard' && <PaymentsDashboard />}
      {tab === 'plans' && <PlansManager />}
      {tab === 'requests' && <PaymentRequestsTab />}
      {tab === 'history' && <PaymentHistoryTab />}
      {tab === 'extension' && <SubscriptionExtensionTab />}
      {tab === 'methods' && <PaymentMethodsManager />}
    </div>
  );
}