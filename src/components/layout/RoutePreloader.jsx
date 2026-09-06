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

    return () => {
      document.removeEventListener('pointerdown', onIntent);
    };
  }, []);

  return null;
}