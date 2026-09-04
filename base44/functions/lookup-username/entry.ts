import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const username = String(body.username || '').trim();
    if (!username) return Response.json({ error: 'Kullanıcı adı gerekli' }, { status: 400 });

    // Önce tam eşleşme dene
    let matches = await base44.asServiceRole.entities.User.filter({ username }, 'created_date', 5);
    let target = matches.find((u) => u.id);

    // Bulunamazsa case-insensitive ara
    if (!target) {
      const allUsers = await base44.asServiceRole.entities.User.list(500);
      target = allUsers.find((u) => (u.username || '').toLowerCase() === username.toLowerCase());
    }

    if (!target) return Response.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

    return Response.json({ email: target.email });
  } catch (error) {
    return Response.json({ error: error.message || 'İşlem başarısız' }, { status: 500 });
  }
}