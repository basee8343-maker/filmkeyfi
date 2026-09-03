import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sunucu tarafı tanıtım klibi üretimi.
// getDisplayMedia/MediaRecorder KULLANILMAZ — tarayıcı ekran kaydı yok.
// Core GenerateVideo (Google Veo) ile sunucuda MP4 üretilir.
// Admin-only: sadece adminler çağırabilir.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Yetkisiz' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Yalnızca admin' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const prompt = (body?.scene_prompt || '').trim();
    if (!prompt) return Response.json({ error: 'scene_prompt gerekli' }, { status: 400 });
    const aspect = body?.aspect_ratio === '9:16' ? '9:16' : '16:9';

    const result = await base44.asServiceRole.integrations.Core.GenerateVideo({
      prompt,
      duration: 8,
      aspect_ratio: aspect,
      generate_audio: false,
    });

    if (!result?.url) return Response.json({ error: 'Video URL alınamadı' }, { status: 500 });
    return Response.json({ url: result.url, duration: 8 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Video oluşturulamadı' }, { status: 500 });
  }
}