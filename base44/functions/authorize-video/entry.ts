import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { validateUrl, rateLimit, safeErrorResponse, logSecurity } from '../../shared/security.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { movie_id, episode_id } = body || {};
    if (!movie_id) return Response.json({ error: 'movie_id required' }, { status: 400 });

    // Rate limit: 30 istek / dakika / kullanıcı
    const rl = await rateLimit(base44, 'video:' + user.id, user.id, 30, 60000);
    if (!rl.allowed) return Response.json({ error: 'çok fazla istek' }, { status: 429 });

    const me = await base44.asServiceRole.entities.User.get(user.id);
    // Admin/moderator her zaman erişebilir
    if (me.role === 'admin' || me.role === 'moderator') {
      // yetki kontrolünü atla, videoyu döndür
    } else {
      // Otomatik süre dolması
      if (me.membership_end && new Date(me.membership_end) < new Date() && me.membership_status === 'active') {
        await base44.asServiceRole.entities.User.update(user.id, {
          membership_status: 'expired',
          subscription_status: 'EXPIRED',
        }).catch(() => {});
        await logSecurity(base44, 'video_access_denied', user, 'membership expired: ' + movie_id, 'warning');
        return Response.json({ error: 'aboneliğiniz sona erdi', expired: true }, { status: 403 });
      }
      if (me.membership_status !== 'active') {
        await logSecurity(base44, 'video_access_denied', user, 'membership inactive: ' + movie_id, 'warning');
        return Response.json({ error: 'üyelik aktif değil', expired: me.membership_status === 'expired' }, { status: 403 });
      }
    }

    const movie = await base44.asServiceRole.entities.Movie.get(movie_id);
    if (!movie) return Response.json({ error: 'içerik bulunamadı' }, { status: 404 });
    if (movie.published === false) {
      await logSecurity(base44, 'video_access_denied', user, 'unpublished: ' + movie_id, 'warning');
      return Response.json({ error: 'içerik yayında değil' }, { status: 403 });
    }

    let url = '';
    if (episode_id) {
      const eps = await base44.asServiceRole.entities.Episode.filter({ series_id: movie_id });
      const ep = eps.find((e) => e.id === episode_id) || eps[0];
      url = ep?.video_url || ep?.hls_url || '';
    } else if (movie.video_file_uri) {
      const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: movie.video_file_uri, expires_in: 3600
      });
      url = signed.signed_url;
    } else {
      url = movie.video_url || movie.hls_url || movie.external_url || '';
    }

    if (!url) return Response.json({ error: 'video kaynağı yok' }, { status: 404 });

    // SSRF koruması: URL'yi doğrula (signed URL'ler hariç — platform tarafından üretiliyor)
    if (!movie.video_file_uri) {
      const valid = validateUrl(url);
      if (!valid) {
        await logSecurity(base44, 'video_url_blocked', user, movie_id, 'warning');
        return Response.json({ error: 'geçersiz video kaynağı' }, { status: 400 });
      }
      url = valid;
    }

    await logSecurity(base44, 'video_authorized', user, movie_id, 'info');
    return Response.json({ url });
  } catch (e) {
    return safeErrorResponse(e);
  }
}