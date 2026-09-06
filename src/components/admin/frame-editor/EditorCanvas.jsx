import { useEffect, useRef } from 'react';
import useEditorGestures from '@/hooks/useEditorGestures';
import { renderFrameEditor } from '@/lib/renderFrameEditor';

export default function EditorCanvas({ editor }) {
  const ref = useRef(null), gestures = useEditorGestures(ref, editor);
  useEffect(() => {
    const canvas = ref.current; if (!canvas || !editor.image) return;
    const resize = () => { const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); renderFrameEditor(canvas, editor.image, editor.selection, editor); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize(); return () => observer.disconnect();
  }, [editor.image, editor.selection, editor.zoom, editor.pan, editor.showMask, editor.maskView, editor.touch]);
  if (!editor.image) return <label className="m-auto flex min-h-64 w-[calc(100%-2rem)] max-w-md items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 text-center text-lg font-bold">＋ PNG Yükle<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && editor.load(e.target.files[0])} /></label>;
  return <div className="relative h-full min-h-0 w-full overflow-hidden bg-secondary/40" style={{ backgroundImage: 'conic-gradient(hsl(var(--muted)) 25%,hsl(var(--card)) 0 50%,hsl(var(--muted)) 0 75%,hsl(var(--card)) 0)', backgroundSize: '20px 20px' }}><canvas ref={ref} {...gestures} className="h-full w-full touch-none" /><span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1.5 text-sm font-bold">{Math.round(editor.zoom * 100)}%</span></div>;
}