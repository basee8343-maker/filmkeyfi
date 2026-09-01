import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
    const get = (k, f = '') => configs.find((c) => c.key === k)?.value ?? f;
    return Response.json({
      maintenance_mode: get('maintenance_mode', 'false') === 'true',
      registration_open: get('registration_open', 'true') === 'true',
      app_theme: get('app_theme', 'auto'),
    });
  } catch (e) {
    return Response.json({ maintenance_mode: false, registration_open: true, app_theme: 'auto' });
  }
}