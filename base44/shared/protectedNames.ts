// Kullanıcı adında kullanılması yasak yetki/rol kelimeleri.
// Nokta, çizgi, boşluk, emoji gibi karakterlerle gizlenmeye çalışılsa da
// algılanır: tüm ayraçlar temizlenip küçük harfe indirildikten sonra
// alt-dize eşleşmesi yapılır.

const KEYWORDS = [
  'admin',
  'administrator',
  'kurucu',
  'yonetici',
  'moderator',
  'moderatör',
  'founder',
  'yetkili',
  'sistem',
  'official',
  'resmi',
  'destek',
  'support',
  'canabim',
  'canablam',
  'yönetici',
];

function normalize(value: string): string {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/Ş/g, 's')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function findProtectedName(username: string): string | null {
  const normalized = normalize(username);
  if (!normalized) return null;
  for (const keyword of KEYWORDS) {
    const nk = normalize(keyword);
    if (nk && normalized.includes(nk)) return keyword;
  }
  return null;
}