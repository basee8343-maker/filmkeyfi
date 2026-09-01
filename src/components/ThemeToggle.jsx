import { useTheme } from '@/lib/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const { theme, cycleTheme } = useTheme();
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'dark' ? 'Karanlık' : theme === 'light' ? 'Aydınlık' : 'Otomatik';
  return (
    <button
      onClick={cycleTheme}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/60 hover:bg-secondary transition-colors ${className}`}
      title={`Tema: ${label} (değiştirmek için tıkla)`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}