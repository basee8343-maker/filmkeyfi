import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import useFrameEditor from '@/hooks/useFrameEditor';
import { useFrameCatalog } from '@/lib/FrameCatalogContext';
import { useToast } from '@/components/ui/use-toast';
import EditorHeader from './EditorHeader';
import EditorCanvas from './EditorCanvas';
import EditorToolbar from './EditorToolbar';
import SelectionPanel from './SelectionPanel';
import EditorActions from './EditorActions';

export default function MobileFrameEditor({ onClose }) {
  const editor = useFrameEditor(), { refreshFrames } = useFrameCatalog(), { toast } = useToast(), [saving, setSaving] = useState(false);
  const save = async () => {
    if (!editor.name.trim() || !editor.opening) return toast({ title: 'Önce profil alanını seçip şeffaflaştırın', variant: 'destructive' });
    setSaving(true);
    try { const file = await editor.makeFile(), { file_url } = await base44.integrations.Core.UploadFile({ file }); await base44.entities.SpecialFrame.create({ name: editor.name.trim(), image_url: file_url, opening: editor.opening, active: true }); await refreshFrames(); toast({ title: 'Çerçeve atama kataloğuna eklendi' }); onClose(); }
    catch (error) { toast({ title: 'Kaydedilemedi', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background"><EditorHeader onBack={onClose} onUndo={editor.undo} canUndo={editor.applied} /><main className="min-h-0 flex-1"><EditorCanvas editor={editor} /></main>{editor.image && <div className="mx-auto w-full max-w-3xl shrink-0"><EditorToolbar tool={editor.tool} onTool={editor.setTool} /><SelectionPanel editor={editor} /><EditorActions editor={editor} saving={saving} onSave={save} /></div>}</div>;
}