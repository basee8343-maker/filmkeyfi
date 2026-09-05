import { useEffect } from 'react';

const routeLoaders = {
  '/': () => import('@/pages/Home'),
  '/filmler': () => import('@/pages/Browse'),
  '/acik-odalar': () => import('@/pages/OpenRooms'),
  '/oda-kur': () => import('@/pages/CreateRoom'),
  '/arkadaslar': () => import('@/pages/Friends'),
  '/listem': () => import('@/pages/MyList'),
  '/ara': () => import('@/pages/Search'),
  '/profil': () => import('@/pages/Profile'),
  '/abonelik': () => import('@/pages/Subscription'),
};

const preload = (path) => {
  const cleanPath = path.split('?')[0];
  routeLoaders[cleanPath]?.();
};

export default function RoutePreloader() {
  useEffect(() => {
    const onIntent = (event) => {
      const anchor = event.target.closest?.('a[href]');
      if (anchor?.origin === window.location.origin) preload(anchor.pathname);
    };
    document.addEventListener('pointerdown', onIntent, { passive: true });
    document.addEventListener('pointerover', onIntent, { passive: true });

    const warm = () => ['/filmler', '/acik-odalar', '/oda-kur', '/arkadaslar'].forEach(preload);
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(warm, { timeout: 2000 })
      : window.setTimeout(warm, 1200);

    return () => {
      document.removeEventListener('pointerdown', onIntent);
      document.removeEventListener('pointerover', onIntent);
      window.cancelIdleCallback?.(idleId);
      window.clearTimeout(idleId);
    };
  }, []);

  return null;
}