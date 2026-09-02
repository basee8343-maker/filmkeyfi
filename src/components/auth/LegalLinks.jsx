import { useState } from 'react';
import { X } from 'lucide-react';

const documents = {
  terms: { title: 'Kullanım Koşulları', sections: [
    ['Hizmetin Kullanımı','Film Keyfi hizmetleri yalnızca kişisel ve yasal kullanım içindir. Hesabınızın güvenliğinden, doğru bilgi vermekten ve erişim bilgilerinizi paylaşmamaktan siz sorumlusunuz.'],
    ['Abonelik ve Erişim','Premium içerik erişimi, başarılı ödeme sonrasında başlar ve seçilen paketin süresi boyunca devam eder. Aboneliği aktif olmayan hesaplar yalnızca abonelik ve destek alanlarına erişebilir.'],
    ['Ödeme ve Kart Güvenliği','Ödemeler yetkili ödeme sağlayıcılarının güvenli sayfalarında gerçekleştirilir. Kart numarası, son kullanma tarihi ve güvenlik kodu Film Keyfi sunucularında tutulmaz veya saklanmaz. İşlem sonucu ve abonelik için gerekli sınırlı ödeme kaydı saklanabilir.'],
    ['Hesap Güvenliği','Güçlü ve benzersiz bir şifre kullanmanız, doğrulama kodlarını kimseyle paylaşmamanız ve ortak cihazlarda oturumu kapatmanız gerekir. Şüpheli erişim fark ederseniz şifrenizi değiştirerek bizimle iletişime geçin.'],
    ['Topluluk Kuralları','İzleme odalarında taciz, hakaret, yasa dışı içerik paylaşımı ve diğer kullanıcıların deneyimini bozan davranışlar yasaktır. İhlaller hesabın sınırlandırılmasına yol açabilir.'],
    ['Fikri Mülkiyet','Film Keyfi marka adı, uygulama tasarımı ve hizmete ait özgün içerikler ilgili hak sahiplerine aittir. İzinsiz kopyalama, çoğaltma veya ticari kullanım yasaktır.'],
    ['Değişiklikler','Hizmet özellikleri ve koşullar gerekli durumlarda güncellenebilir. Önemli değişiklikler uygulama üzerinden duyurulur.'] ] },
  privacy: { title: 'Gizlilik Politikası', sections: [
    ['Toplanan Bilgiler','Hesap oluştururken ad, e-posta, profil bilgileri ve hizmet kullanım kayıtları işlenir. Ödeme kartı bilgileri doğrudan yetkili ödeme sağlayıcısı tarafından işlenir.'],
    ['Kart Verilerinin Saklanmaması','Kart numarası, CVV/CVC güvenlik kodu ve son kullanma tarihi Film Keyfi sunucularına kaydedilmez ve tarafımızca saklanmaz. Yalnızca ödeme durumu, işlem numarası, tutar ve tarih gibi aboneliğin doğrulanması için gerekli işlem bilgileri tutulabilir.'],
    ['Kullanım Amaçları','Bilgiler hesabı yönetmek, aboneliği doğrulamak, güvenliği sağlamak, destek sunmak ve hizmet kalitesini geliştirmek amacıyla kullanılır.'],
    ['Hesap ve Veri Güvenliği','Yetkisiz erişimi önlemek için erişim kontrolleri ve uygun teknik tedbirler uygulanır. Kullanıcı, hesabına ait şifre ve doğrulama bilgilerinin gizliliğini korumakla sorumludur.'],

    ['Paylaşım ve Güvenlik','Veriler yalnızca hizmetin çalışması için gerekli sağlayıcılarla ve yasal zorunluluk durumlarında paylaşılır. Yetkisiz erişime karşı uygun teknik önlemler uygulanır.'],
    ['Haklarınız','Hesabınızla ilişkili veriler hakkında bilgi, düzeltme veya silme talebinizi destek alanından iletebilirsiniz.'] ] },
  cookies: { title: 'Çerez Politikası', sections: [
    ['Zorunlu Çerezler','Oturumun açık tutulması, güvenli giriş, tercihlerin hatırlanması ve ödeme yönlendirmelerinin çalışması için zorunlu çerezler kullanılır.'],
    ['Tercih ve Analiz','Tema ve cihaz tercihleri yerel olarak saklanabilir. Hizmet performansını anlamak için kimliği doğrudan belirlemeyen kullanım verileri işlenebilir.'],
    ['Ödeme Çerezleri','Ödeme sağlayıcısı güvenli işlem, dolandırıcılık önleme ve ödeme oturumunun tamamlanması amacıyla kendi zorunlu çerezlerini kullanabilir. Bu çerezler kart bilgilerinin Film Keyfi tarafından saklandığı anlamına gelmez.'],
    ['Kontrol','Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Zorunlu çerezlerin engellenmesi giriş ve abonelik işlevlerini bozabilir.'] ] },
  contact: { title: 'İletişim Bilgileri', sections: [
    ['Marka ve Yetkili','Marka: Film Keyfi\nYetkili: Ali Tor'],
    ['E-posta ve Telefon','E-posta: filmkeyfi74@gmail.com\nTelefon: 0551 825 05 48'],
    ['Adres','Bartın Merkez, Kemer Köprü Mahallesi, 150. Cadde'],
    ['Destek','Hesap, abonelik, ödeme veya kişisel verilerle ilgili talepleriniz için yukarıdaki iletişim kanallarından bize ulaşabilirsiniz. Güvenliğiniz için e-posta veya telefon üzerinden kart şifresi, CVV/CVC kodu ya da doğrulama kodu talep etmeyiz.'] ] },
};

export default function LegalLinks({ className = '' }) {
  const [active, setActive] = useState(null); const doc = active && documents[active];
  return <><span className={`inline-flex flex-wrap justify-center gap-x-2 gap-y-1 ${className}`}>
    <button type="button" onClick={() => setActive('terms')} className="hover:underline">Kullanım Koşulları</button>
    <button type="button" onClick={() => setActive('privacy')} className="hover:underline">Gizlilik Politikası</button>
    <button type="button" onClick={() => setActive('cookies')} className="hover:underline">Çerez Politikası</button>
    <button type="button" onClick={() => setActive('contact')} className="hover:underline">İletişim</button>
  </span>
  {doc && <div className="fixed inset-0 z-[200] bg-black/75 flex items-center justify-center p-4" onClick={() => setActive(null)}>
    <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-[#141414] border border-[#333] text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="sticky top-0 bg-[#141414] border-b border-[#2a2a2a] p-5 flex items-center justify-between"><h2 className="text-xl font-bold">{doc.title}</h2><button type="button" onClick={() => setActive(null)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Kapat"><X className="w-5 h-5" /></button></div>
      <div className="p-5 space-y-5">{doc.sections.map(([title,text]) => <section key={title}><h3 className="font-semibold mb-1">{title}</h3><p className="text-sm leading-6 text-[#b8b8b8] whitespace-pre-line">{text}</p></section>)}<p className="text-xs text-[#777] pt-2 border-t border-[#2a2a2a]">Son güncelleme: 2 Eylül 2026</p></div>
    </div>
  </div>}</>;
}