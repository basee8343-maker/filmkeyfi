import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { rateLimit, safeErrorResponse } from '../../shared/security.ts';
import { getAdminVerificationStatus, markAdminVerified, requireFreshAdmin } from '../../shared/adminAuth.ts';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes) {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  str = str.replace(/=+$/, '').toUpperCase();
  let bits = 0, value = 0, out = [];
  for (const c of str) {
    const idx = B32.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

async function hmacSha1(keyBytes, msg) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msg);
  return new Uint8Array(sig);
}

async function totp(secretB32, counter) {
  const keyBytes = base32Decode(secretB32);
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter & 0xffffffff);
  const hash = await hmacSha1(keyBytes, new Uint8Array(buf));
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
  return (code % 1000000).toString().padStart(6, '0');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'admin only' }, { status: 403 });
    const body = await req.json();
    const { action, code } = body || {};
    const now = Math.floor(Date.now() / 1000);

    if (action === 'setup') {
      const fresh = await base44.asServiceRole.entities.User.get(user.id);
      if (fresh.twofa_enabled) {
        const denied = await requireFreshAdmin(base44, req, user);
        if (denied) return denied;
      }
      const secretBytes = crypto.getRandomValues(new Uint8Array(20));
      const secret = base32Encode(secretBytes);
      await base44.asServiceRole.entities.User.update(user.id, { twofa_secret: secret, twofa_enabled: false });
      const label = encodeURIComponent('FilmKeyfi:' + (user.username || user.email));
      return Response.json({ secret, otpauth: `otpauth://totp/${label}?secret=${secret}&issuer=FilmKeyfi` });
    }

    if (action === 'enable') {
      const me = await base44.asServiceRole.entities.User.get(user.id);
      if (!me.twofa_secret) return Response.json({ error: 'önce setup yapın' }, { status: 400 });
      const expected = await totp(me.twofa_secret, Math.floor(now / 30));
      if (expected !== String(code)) {
        await base44.asServiceRole.entities.SecurityLog.create({
          action: '2fa_verify_failed', user_id: user.id, user_email: '',
          detail: 'enable', level: 'warning'
        });
        return Response.json({ error: 'hatalı kod' }, { status: 400 });
      }
      await base44.asServiceRole.entities.User.update(user.id, { twofa_enabled: true });
      await base44.asServiceRole.entities.SecurityLog.create({
        action: '2fa_enabled', user_id: user.id, user_email: '', level: 'info'
      });
      return Response.json({ ok: true });
    }

    if (action === 'verify') {
      // Rate limit: 10 verify denemesi / dakika (brute-force koruması)
      const rl = await rateLimit(base44, '2fa-verify:' + user.id, user.id, 10, 60000);
      if (!rl.allowed) return Response.json({ error: 'çok fazla deneme, bekleyin' }, { status: 429 });
      const me = await base44.asServiceRole.entities.User.get(user.id);
      if (!me.twofa_enabled || !me.twofa_secret) return Response.json({ ok: true, enabled: false });
      const counter = Math.floor(now / 30);
      for (let w = -1; w <= 1; w++) {
        const expected = await totp(me.twofa_secret, counter + w);
        if (expected === String(code)) {
          const marked = await markAdminVerified(base44, req, user);
          if (!marked) return Response.json({ error: 'Güvenli oturum doğrulanamadı' }, { status: 401 });
          await base44.asServiceRole.entities.SecurityLog.create({
            action: '2fa_verify_ok', user_id: user.id, user_email: '', level: 'info'
          });
          return Response.json({ ok: true, verified: true });
        }
      }
      await base44.asServiceRole.entities.SecurityLog.create({
        action: '2fa_verify_failed', user_id: user.id, user_email: '',
        detail: 'verify', level: 'warning'
      });
      return Response.json({ error: 'hatalı kod', verified: false }, { status: 400 });
    }

    if (action === 'status') {
      const me = await base44.asServiceRole.entities.User.get(user.id);
      const status = await getAdminVerificationStatus(base44, req, user);
      return Response.json({ enabled: !!me.twofa_enabled, hasSecret: !!me.twofa_secret, verified: status.verified });
    }

    if (action === 'disable') {
      const denied = await requireFreshAdmin(base44, req, user);
      if (denied) return denied;
      await base44.asServiceRole.entities.User.update(user.id, { twofa_secret: '', twofa_enabled: false });
      await base44.asServiceRole.entities.AdminVerification.deleteMany({ user_id: user.id }).catch(() => {});
      await base44.asServiceRole.entities.SecurityLog.create({
        action: '2fa_disabled', user_id: user.id, user_email: '', level: 'warning'
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'invalid action' }, { status: 400 });
  } catch (e) {
    return safeErrorResponse(e);
  }
}