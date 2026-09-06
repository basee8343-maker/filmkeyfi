import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FRAME_DEFINITIONS } from '@/lib/roles';
import { clearFrameCaches, makePreparedTransparent, makeTransparentFrame } from '@/components/xp/frameTransparency';

const FrameCatalogContext = createContext({ frames: FRAME_DEFINITIONS, refreshFrames: () => {} });

export function FrameCatalogProvider({ children }) {
  const [specialFrames, setSpecialFrames] = useState([]);
  const refreshFrames = useCallback(() => { clearFrameCaches(); return base44.entities.SpecialFrame.filter({ active: true }, '-created_date', 100).then(setSpecialFrames); }, []);
  useEffect(() => { refreshFrames(); const off = base44.entities.SpecialFrame.subscribe(refreshFrames); return off; }, [refreshFrames]);
  const frames = useMemo(() => {
    const custom = Object.fromEntries(specialFrames.map((item) => [`special:${item.id}`, {
      label: item.name, color: item.theme_color || '#f97316', image_url: item.image_url,
      opening: item.opening || [0.24, 0.24, 0.52, 0.52], prepared: true, group: 'custom',
    }]));
    return { ...FRAME_DEFINITIONS, ...custom };
  }, [specialFrames]);

  // Önceden ısıtma: tüm çerçeveleri arka planda işleyip cache'e al.
  // Böylece profil/arkadaş sayfaları açıldığında çerçeveler anında görünür.
  useEffect(() => {
    Object.values(frames).forEach((info) => {
      if (!info?.image_url) return;
      if (info.prepared) makePreparedTransparent(info.image_url, info.opening);
      else if (info.sprite) makeTransparentFrame(info.image_url, info.sprite);
    });
  }, [frames]);

  return <FrameCatalogContext.Provider value={{ frames, refreshFrames }}>{children}</FrameCatalogContext.Provider>;
}

export const useFrameCatalog = () => useContext(FrameCatalogContext);