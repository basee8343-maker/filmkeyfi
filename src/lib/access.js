const BASIC_PATHS = [
  '/',
  '/filmler',
  '/kategoriler',
  '/acik-odalar',
  '/openrooms',
  '/odalar',
  '/arkadaslar',
  '/ara',
  '/listem',
  '/profil',
  '/kullanici',
  '/destek',
  '/bildirimler',
  '/abonelik',
  '/odeme',
  '/odeme-gecmisim',
  '/güvenlik-protokolü',
  '/bakim',
];

export function isBasicPath(pathname = '/') {
  return BASIC_PATHS.some((path) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));
}