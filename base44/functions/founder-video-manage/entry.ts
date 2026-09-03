import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Kurucu rolü giriş/çıkış AI videolarının yönetimi.
// Admin-only: sadece adminler çağırabilir.
// action: 'get'    — mevcut video URL'lerini döndür
// action: 'generate' — yeni AI video üret (type: 'entry' | 'exit'), AppConfig'e kaydet
// action: 'delete'  — video URL'sini AppConfig'den sil (type: 'entry' | 'exit')

const PROMPTS = {
  entry: 'Dark cinematic atmosphere with powerful realistic flames rising from the ground. The flames grow increasingly intense and dramatic. From within the flames and intense fire, a strong charismatic man in an elegant black tailored suit emerges, walking confidently toward the camera in a mafia boss style, serious and powerful expression. Flames continue to rise behind and on both sides as he walks forward. Sparks and small fire particles scatter in the air around him. The camera follows the character cinematically with slow motion. Photorealistic fire, light, shadow, volumetric smoke, cinematic color grading. Real human, not cartoon, not anime, not 2D animation. In the final moments, the character and flames erupt with a powerful burst of fire and then fade to black. Ultra realistic, 8k quality, dramatic lighting.',
  exit: 'Dark cinematic atmosphere with large realistic flames rising. A strong charismatic man in an elegant black tailored suit stands among the flames, mafia boss style, serious expression. He takes a few slow steps forward walking, then turns and walks into the flames, slowly disappearing into the fire. Flames and sparks continue to rise behind him as he fades. Finally the flames themselves gradually die down and fade away, and the screen returns to dark. Photorealistic fire, light, shadow, volumetric smoke, cinematic color grading. Real human, not cartoon, not anime, not 2D animation. Ultra realistic, 8k quality, dramatic lighting, slow motion.',
};

const CONFIG_KEYS = {
  entry: 'founder_entry_video',
  exit: 'founder_exit_video',
};

async function getConfig(base44, key) {
  const records = await base44.asServiceRole.entities.AppConfig.filter({ key }, '-created_date', 1).catch(() => []);
  return records[0] || null;
}

async function setConfig(base44, key, value) {
  const existing = await getConfig(base44, key);
  if (existing) {
    await base44.asServiceRole.entities.AppConfig.update(existing.id, { value });
  } else {
    await base44.asServiceRole.entities.AppConfig.create({ key, value });
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Yetkisiz' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Yalnızca admin' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'get';

    if (action === 'get') {
      const entry = await getConfig(base44, CONFIG_KEYS.entry);
      const exit = await getConfig(base44, CONFIG_KEYS.exit);
      return Response.json({
        entry_video: entry?.value || '',
        exit_video: exit?.value || '',
      });
    }

    if (action === 'delete') {
      const type = body?.type;
      if (!CONFIG_KEYS[type]) return Response.json({ error: 'geçersiz type' }, { status: 400 });
      const existing = await getConfig(base44, CONFIG_KEYS[type]);
      if (existing) await base44.asServiceRole.entities.AppConfig.update(existing.id, { value: '' });
      return Response.json({ ok: true });
    }

    if (action === 'generate') {
      const type = body?.type;
      if (!CONFIG_KEYS[type]) return Response.json({ error: 'geçersiz type' }, { status: 400 });
      const result = await base44.asServiceRole.integrations.Core.GenerateVideo({
        prompt: PROMPTS[type],
        duration: 4,
        aspect_ratio: '16:9',
        generate_audio: false,
      });
      if (!result?.url) return Response.json({ error: 'Video URL alınamadı' }, { status: 500 });
      await setConfig(base44, CONFIG_KEYS[type], result.url);
      return Response.json({ ok: true, url: result.url });
    }

    return Response.json({ error: 'geçersiz action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'İşlem başarısız' }, { status: 500 });
  }
}