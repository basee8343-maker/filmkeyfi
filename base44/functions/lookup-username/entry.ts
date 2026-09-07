// Retired: do not disclose account addresses through username lookup.
// Uniform response for old clients; never query account records here.
export default async function(req) {
  return Response.json(
    { error: 'Gizliliğiniz için kullanıcı adıyla giriş kapatıldı. E-posta adresinizle giriş yapın.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}