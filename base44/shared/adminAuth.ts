const VERIFICATION_TTL_MS = 30 * 60 * 1000;

async function tokenFingerprint(req) {
  const authorization = req.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(authorization));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getAdminVerificationStatus(base44, req, user) {
  if (!user || user.role !== 'admin') return { enabled: false, verified: false };
  const freshUser = await base44.asServiceRole.entities.User.get(user.id);
  if (!freshUser.twofa_enabled) return { enabled: false, verified: false };
  const fingerprint = await tokenFingerprint(req);
  if (!fingerprint) return { enabled: true, verified: false };
  const rows = await base44.asServiceRole.entities.AdminVerification.filter({ user_id: user.id, token_fingerprint: fingerprint }, '-expires_at', 1).catch(() => []);
  return { enabled: true, verified: new Date(rows[0]?.expires_at || 0).getTime() > Date.now() };
}

export async function markAdminVerified(base44, req, user) {
  const fingerprint = await tokenFingerprint(req);
  if (!fingerprint) return false;
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();
  const rows = await base44.asServiceRole.entities.AdminVerification.filter({ user_id: user.id, token_fingerprint: fingerprint }, '-created_date', 1).catch(() => []);
  if (rows[0]) await base44.asServiceRole.entities.AdminVerification.update(rows[0].id, { expires_at: expiresAt });
  else await base44.asServiceRole.entities.AdminVerification.create({ user_id: user.id, token_fingerprint: fingerprint, expires_at: expiresAt });
  return true;
}

export async function requireFreshAdmin(base44, req, user) {
  if (!user) return Response.json({ error: 'Oturum gerekli' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Yetkisiz' }, { status: 403 });
  const status = await getAdminVerificationStatus(base44, req, user);
  if (!status.verified) return Response.json({ error: 'Yönetici doğrulaması gerekli', requires_2fa: true }, { status: 403 });
  return null;
}