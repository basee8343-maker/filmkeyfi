// Engelleme/askıya alma/silme bildirimlerini login ekranına taşımak için
// sessionStorage köprüsü — URL parametresi redirect sırasında kaybolsa bile
// login ekranı uyarıyı ve nedenini gösterir.
export function triggerBanNotice(type, reason = '', description = '') {
  try {
    const payload = JSON.stringify({ type, reason, description });
    sessionStorage.setItem('filmkeyfi_ban_notice', payload);
  } catch {}
}

export function consumeBanNotice() {
  try {
    const raw = sessionStorage.getItem('filmkeyfi_ban_notice');
    sessionStorage.removeItem('filmkeyfi_ban_notice');
    if (!raw) return null;
    // Geriye dönük uyumluluk: eski sürüm string tipi kaydediyordu
    if (raw.startsWith('{')) return JSON.parse(raw);
    return { type: raw, reason: '', description: '' };
  } catch { return null; }
}