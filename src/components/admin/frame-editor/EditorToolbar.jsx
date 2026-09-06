const tools = [['auto', '🪄', 'Otomatik'], ['color', '🎨', 'Renk'], ['manual', '✋', 'Manuel'], ['eraser', '🧹', 'Silgi']];
export default function EditorToolbar({ tool, onTool }) {
  return <nav className="grid grid-cols-4 gap-2 border-t border-border bg-card p-2">{tools.map(([key, icon, label]) => <button key={key} onClick={() => onTool(key)} className={`min-h-14 rounded-xl px-1 py-2 text-sm font-bold ${tool === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}><span className="block text-xl">{icon}</span>{label}</button>)}</nav>;
}