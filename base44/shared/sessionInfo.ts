// Cihaz / IP / konum tespiti için ortak yardımcılar — register-session ve update-presence tarafından kullanılır.

export function getClientIp(req) {
  const h = req.headers;
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') || h.get('cf-connecting-ip') || h.get('true-client-ip') || h.get('x-client-ip') || '';
}

export function parseUserAgent(ua) {
  ua = ua || '';
  let os = 'Bilinmiyor';
  let browser = 'Bilinmiyor';
  let deviceType = 'Bilgisayar';
  let model = '';

  if (/Windows NT 10/i.test(ua)) os = 'Windows';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/iPad/i.test(ua)) os = 'iPadOS';
  else if (/iPhone|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  if (/iPad/i.test(ua)) deviceType = 'Tablet';
  else if (/Mobile|Android|iPhone|iPod/i.test(ua)) deviceType = 'Telefon';
  else deviceType = 'Bilgisayar';

  if (/iPhone/i.test(ua)) model = 'iPhone';
  else if (/iPad/i.test(ua)) model = 'iPad';
  else if (/Macintosh/i.test(ua)) model = 'Mac';
  else {
    const m = ua.match(/Android[^;]*;\s*([^;)]+?)\s*(?:Build|\))/i);
    if (m) model = m[1].trim();
  }

  return { os, browser, deviceType, model };
}

async function tryIpapiCo(ip) {
  const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { headers: { 'User-Agent': 'FilmKeyfi/1.0' } });
  const data = await res.json();
  if (!data || data.error) return null;
  return { country: data.country_name || '', city: data.city || '', region: data.region || '', isp: data.org || '' };
}

async function tryReallyFreeGeoip(ip) {
  const res = await fetch(`https://reallyfreegeoip.org/json/${encodeURIComponent(ip)}`, { headers: { 'User-Agent': 'FilmKeyfi/1.0' } });
  const data = await res.json();
  if (!data || !data.ip) return null;
  return { country: data.country_name || '', city: data.city || '', region: data.region_name || '', isp: '' };
}

async function tryIpwhoIs(ip) {
  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { headers: { 'Accept': 'application/json', 'User-Agent': 'FilmKeyfi/1.0' } });
  const data = await res.json();
  if (!data || data.success === false) return null;
  return { country: data.country || '', city: data.city || '', region: data.region || '', isp: (data.connection && data.connection.isp) || '' };
}

export async function geoLookup(ip) {
  if (!ip) return { country: '', city: '', region: '', isp: '' };
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|fc|fd)/i.test(ip)) {
    return { country: 'Yerel ağ', city: '', region: '', isp: '' };
  }
  const providers = [tryIpapiCo, tryReallyFreeGeoip, tryIpwhoIs];
  for (const p of providers) {
    try {
      const r = await p(ip);
      if (r && (r.country || r.city)) return r;
    } catch {}
  }
  return { country: '', city: '', region: '', isp: '' };
}