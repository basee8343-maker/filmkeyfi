// Engelleme/askıya alma/silme bildirimlerini login ekranına taşımak için
// sessionStorage köprüsü — URL parametresi redirect sırasında kaybolsa bile
// login ekranı uyarıyı gösterir.
export function triggerBanNotice(type) {
  try { sessionStorage.setItem('filmkeyfi_ban_notice', type); } catch {}
}
export function consumeBanNotice() {
  try {
    const v = sessionStorage.getItem('filmkeyfi_ban_notice');
    sessionStorage.removeItem('filmkeyfi_ban_notice');
    return v;
  } catch { return null; }
}