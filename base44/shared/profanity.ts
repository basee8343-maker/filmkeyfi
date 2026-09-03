// Uygunsuz kelime filtresi — oda/özel sohbet mesajları için ortak modül.

const PROFANITY_WORDS = [
  'amk','amq','amık','amuk','amina','amına','amini','amını','amcık','amcik','amck','amcq','amcuk','amuck',
  'oç','orosbu','orospu','orospucocugu','piç','pic','piçkurusu',
  'siktir','siktr','s1ktir','sik','s1k','sikem','sikicem','sikim','sikimi','sikisin','sikerim','sikayim',
  'yarrak','yarragi','yarragim','yarram','yarramin','yarraim','yarak','yarrakli',
  'çük','cuk','bok','göt','got','götten','gotten','götveren','gotveren','götüm','gotum','götümü','gotumu',
  'yavşak','yavsak','pezevenk','pezo','puşt','kaltak','fahişe','fahise','sürtük','kahpe','kaşar','kasar',
  'şerefsiz','serefsiz','ibne','gey','lezbiyen','lez','sex','seks','porno','porn','çıplak','ciplak','çırıl','ciril',
  'amınakoy','aminakoy','amınakoyim','aminakoyim','amınakoyyim','aminakoyyim','anani','ananı','bacini','bacını','karini','karını',
  'aq','sg','siktirgit','sikgit','götümü','gotumu','amcıklı'
];

export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findProfanity(text: string): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  const tokens = new Set(norm.split(/\s+/));
  const hits: string[] = [];
  for (const w of PROFANITY_WORDS) {
    const nw = normalizeText(w);
    if (!nw) continue;
    if (nw.includes(' ')) {
      if (norm.includes(nw)) hits.push(w);
    } else if (tokens.has(nw)) {
      hits.push(w);
    }
  }
  return [...new Set(hits)];
}

export function containsProfanity(text: string): boolean {
  return findProfanity(text).length > 0;
}