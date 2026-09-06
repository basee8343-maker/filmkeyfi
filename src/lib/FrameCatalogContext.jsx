import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FRAME_DEFINITIONS } from '@/lib/roles';

const FrameCatalogContext = createContext({ frames: FRAME_DEFINITIONS, refreshFrames: () => {} });

export function FrameCatalogProvider({ children }) {
  const [specialFrames, setSpecialFrames] = useState([]);
  const refreshFrames = useCallback(() => base44.entities.SpecialFrame.filter({ active: true }, '-created_date', 100).then(setSpecialFrames), []);
  useEffect(() => { refreshFrames(); const off = base44.entities.SpecialFrame.subscribe(refreshFrames); return off; }, [refreshFrames]);
  const frames = useMemo(() => {
    const custom = Object.fromEntries(specialFrames.map((item) => [`special:${item.id}`, {
      label: item.name, color: item.theme_color || '#f97316', image_url: item.image_url,
      opening: item.opening || [0.24, 0.24, 0.52, 0.52], prepared: true, group: 'custom',
    }]));
    return { ...FRAME_DEFINITIONS, ...custom };
  }, [specialFrames]);
  return <FrameCatalogContext.Provider value={{ frames, refreshFrames }}>{children}</FrameCatalogContext.Provider>;
}

export const useFrameCatalog = () => useContext(FrameCatalogContext);