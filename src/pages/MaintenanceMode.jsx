import { RefreshCw } from 'lucide-react';

export default function MaintenanceMode() {
  const retry = () => window.location.reload();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full text-center bg-card border border-border rounded-2xl p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/15 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">Site Bakım Modunda</h1>
        <p className="text-sm text-muted-foreground mb-6">Şu anda sistem üzerinde bakım çalışması yapılıyor. Lütfen daha sonra tekrar deneyin.</p>
        <button onClick={retry} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold">Tekrar Dene</button>
      </div>
    </div>
  );
}