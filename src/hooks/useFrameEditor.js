import { useRef, useState } from 'react';
import { applyTransparency, colorSelection, connectedSelection, imageDataFile, mergeSelection, paintSelection, readPng, resizeSelection, selectionBounds } from '@/lib/pngSelection';

export default function useFrameEditor() {
  const [image, setImage] = useState(null), [selection, setSelection] = useState(null), [name, setName] = useState('');
  const [tool, setTool] = useState('auto'), [mode, setMode] = useState('new'), [tolerance, setTolerance] = useState(25), [brush, setBrush] = useState(20);
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 }), [showMask, setShowMask] = useState(true), [maskView, setMaskView] = useState(false);
  const [softness, setSoftness] = useState(0), [feather, setFeather] = useState(1), [touch, setTouch] = useState(null), [applied, setApplied] = useState(false);
  const undoImage = useRef(null), lastBounds = useRef(null);
  const load = async (file) => { const next = await readPng(file); setImage(next); setSelection(new Uint8Array(next.width * next.height)); setName(file.name.replace(/\.[^.]+$/, '')); setZoom(1); setPan({ x: 0, y: 0 }); setApplied(false); };
  const selectAt = (x, y) => {
    if (!image || !selection || tool === 'manual' || tool === 'eraser') return;
    const found = tool === 'color' ? colorSelection(image, x, y, tolerance) : connectedSelection(image, x, y, tolerance);
    setSelection(mergeSelection(selection, found, mode));
  };
  const paintAt = (x, y) => { if (!image || !selection || !['manual', 'eraser'].includes(tool)) return; setSelection((old) => paintSelection(old, image.width, image.height, x, y, brush, tool === 'eraser' || mode === 'subtract')); };
  const resize = (grow) => setSelection((old) => resizeSelection(old, image.width, image.height, grow));
  const apply = () => { if (!selection?.some(Boolean)) return false; undoImage.current = image; lastBounds.current = selectionBounds(selection, image.width, image.height); setImage(applyTransparency(image, selection, softness, feather)); setSelection(new Uint8Array(selection.length)); setApplied(true); return true; };
  const undo = () => { if (!undoImage.current) return; setImage(undoImage.current); undoImage.current = null; setApplied(false); };
  const makeFile = () => imageDataFile(image, name);
  const resetSelection = () => selection && setSelection(new Uint8Array(selection.length));
  return { image, selection, name, setName, tool, setTool, mode, setMode, tolerance, setTolerance, brush, setBrush, zoom, setZoom, pan, setPan, showMask, setShowMask, maskView, setMaskView, softness, setSoftness, feather, setFeather, touch, setTouch, applied, opening: lastBounds.current, load, selectAt, paintAt, resize, apply, undo, makeFile, resetSelection };
}