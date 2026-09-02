import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
    const get = (k, f = '') => configs.find((c) => c.key === k)?.value ?? f;
    let shopier = {};
    try { shopier = JSON.parse(get('payment_shopier', '{}')); } catch {}
    const methods = await base44.asServiceRole.entities.PaymentMethod.filter({ enabled: true }, 'sort_order', 50).catch(() => []);
    return Response.json({
      maintenance_mode: get('maintenance_mode', 'false') === 'true',
      registration_open: get('registration_open', 'true') === 'true',
      app_theme: get('app_theme', 'auto'),
      shopier_enabled: shopier.active === true,
      payment_methods: methods.map((m) => ({ id: m.id, provider: m.provider, name: m.display_name, description: m.description || '' })),
    });
  } catch (e) {
    return Response.json({ maintenance_mode: false, registration_open: true, app_theme: 'auto', shopier_enabled: false, payment_methods: [] });
  }
}