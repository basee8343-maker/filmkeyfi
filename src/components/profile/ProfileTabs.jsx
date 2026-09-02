import { Clock, Heart, List, Settings, User } from 'lucide-react';

const tabs = [
  { id: 'info', label: 'Bilgilerim', icon: User },
  { id: 'history', label: 'İzleme Geçmişi', icon: Clock },
  { id: 'list', label: 'Listem', icon: List },
  { id: 'favs', label: 'Favoriler', icon: Heart },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
];

export default function ProfileTabs({ active, onChange }) {
  return <nav className="mb-5 flex items-center gap-1 rounded-full bg-secondary/80 p-1.5 overflow-x-auto no-scrollbar">
    {tabs.map((tab) => <button key={tab.id} onClick={() => onChange(tab.id)} title={tab.label} aria-label={tab.label} className={`h-11 shrink-0 rounded-full px-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${active === tab.id ? 'bg-primary text-primary-foreground flex-1 min-w-fit' : 'text-muted-foreground'}`}><tab.icon className="w-5 h-5 shrink-0" />{active === tab.id && <span>{tab.label}</span>}</button>)}
  </nav>;
}