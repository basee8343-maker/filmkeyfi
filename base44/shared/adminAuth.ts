export function requireFreshAdmin(user) {
  if (!user || user.role !== 'admin') return Response.json({ error: 'Yetkisiz' }, { status: 403 });
  if (user.twofa_enabled) {
    const verifiedUntil = new Date(user.twofa_verified_until || 0).getTime();
    if (!Number.isFinite(verifiedUntil) || verifiedUntil <= Date.now()) {
      return Response.json({ error: 'Yönetici doğrulaması gerekli', requires_2fa: true }, { status: 403 });
    }
  }
  return null;
}