import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin paneli güvenlik olayları (SecurityLog) ve son aktiviteler (AdminLog)
// kayıtlarını 1 günden eskı olanları otomatik siler. Zamanlanmış workflow çağırır.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Doğrudan çağrıyı engelle: auth varsa admin olmalı, yoksa (workflow) devam et
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'yetkisiz' }, { status: 403 });
      }
    } catch {
      // auth yok — workflow çağrısı, devam et
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const securityResult = await base44.asServiceRole.entities.SecurityLog.deleteMany({ created_date: { $lt: cutoff } }).catch(() => ({}));
    const adminResult = await base44.asServiceRole.entities.AdminLog.deleteMany({ created_date: { $lt: cutoff } }).catch(() => ({}));

    return Response.json({ ok: true, cutoff, security: securityResult, admin: adminResult });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}