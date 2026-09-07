// Ortak güvenlik yardımcıları — tüm backend fonksiyonları için

// XSS sanitizasyonu: HTML tag, javascript: scheme, event handler, kontrol karakterlerini temizle
export function sanitizeText(input, maxLen = 1000) {
  if (input == null) return '';
  let s = String(input)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '')
    .trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

const ALLOWED_PROTOCOLS = ['https:', 'http:'];
const PRIVATE_IP_PATTERNS = [
  /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^169\.254\./, /^0\./, /^localhost$/i, /^::1$/, /^fc00:/i, /^fe80:/i,
  /^metadata\.google\.internal$/i, /^metadata\.azure\.com$/i,
  /^100\.6[4-9]\./, /^100\.[7-9][0-9]\./, /^100\.1[01][0-9]\./, /^100\.12[0-7]\./,
  /^\[::1\]$/
];

// URL doğrula: tehlikeli protokol ve private IP/metadata endpoint'lerini engelle (SSRF koruması)
export function validateUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let parsed;
  try { parsed = new URL(url.trim()); } catch { return null; }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return null;
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  for (const p of PRIVATE_IP_PATTERNS) {
    if (p.test(hostname)) return null;
  }
  if (parsed.username || parsed.password) return null;
  return parsed.href;
}

// Base44/Wix storage URL'leri için doğrulama (yüklenen dosyalar)
const UPLOAD_HOSTS = ['media.base44.com', 'static.wixstatic.com'];
export function validateUploadUrl(url) {
  const valid = validateUrl(url);
  if (!valid) return null;
  try {
    const parsed = new URL(valid);
    if (!UPLOAD_HOSTS.includes(parsed.hostname)) return null;
    return valid;
  } catch { return null; }
}

// İstemci IP adresi — kimlik doğrulaması olmayan uç noktalarda hız limiti için
export function clientIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
}

// E-posta maskele — loglarda tam adres göstermemek için
export function maskEmail(email) {
  const value = String(email || '');
  const at = value.indexOf('@');
  if (at < 1) return '';
  const name = value.slice(0, at);
  const domain = value.slice(at);
  return name.slice(0, 2) + '***' + domain;
}

// Rate limiting — RateLimit entity kullanarak
export async function rateLimit(base44, key, userId, max = 10, windowMs = 60000) {
  try {
    const rl = await base44.asServiceRole.entities.RateLimit.filter({ key });
    const now = Date.now();
    const rec = rl[0];
    const start = rec?.window_start ? new Date(rec.window_start).getTime() : 0;
    if (!rec || now - start > windowMs) {
      if (!rec) {
        await base44.asServiceRole.entities.RateLimit.create({
          key, user_id: userId || '', count: 1, window_start: new Date().toISOString()
        });
      } else {
        await base44.asServiceRole.entities.RateLimit.update(rec.id, {
          count: 1, window_start: new Date().toISOString()
        });
      }
      return { allowed: true };
    }
    if (rec.count >= max) {
      await logSecurity(base44, 'rate_limit_exceeded', { id: userId, email: '' }, key, 'warning');
      return { allowed: false };
    }
    await base44.asServiceRole.entities.RateLimit.update(rec.id, { count: rec.count + 1 });
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

// Güvenli hata yanıtı — internal detayları kullanıcıya gösterme
export function safeErrorResponse(e, msg = 'Bir hata oluştu. Lütfen tekrar deneyin.') {
  console.error('[Backend Error]', e?.message || String(e));
  return Response.json({ error: msg }, { status: 500 });
}

// Güvenlik log'u
export async function logSecurity(base44, action, user, detail = '', level = 'info') {
  try {
    await base44.asServiceRole.entities.SecurityLog.create({
      action,
      user_id: user?.id || '',
      user_email: user?.email || '',
      detail: String(detail).slice(0, 500),
      level
    });
  } catch {}
}