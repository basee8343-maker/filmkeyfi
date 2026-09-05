const base = 'https://base44.app/api/apps/6a77d66e4da6de214628ee62/files/mp/public/6a77d66e4da6de214628ee62/';
const frame = (label, color, image, mask, opening) => ({ label, color, image_url: base + image, mask_url: base + mask, opening, prepared: true });

// Original RGB artwork; only connected background regions were made transparent.
// Each opening mask follows that image's actual inner edge, including ornaments.
const frameCatalog = {
  admin_yardimcisi: frame('Admin Yardımcısı', '#1d4ed8', 'b685c98f7_admin-yardimcisi.png', 'f5e2b1fde_admin-yardimcisi-opening.png', [0.20494, 0.22568, 0.58931, 0.50399]),
  admin_mavi_kirmizi: frame('Admin', '#e11d48', '9919c4134_admin.png', 'ff1d330c9_admin-opening.png', [0.20734, 0.2177, 0.58453, 0.54705]),
  turgay: frame('Turgay Mavi', '#1565c0', '0e9d1406c_turgay-mavi.png', '987a02aee_turgay-mavi-opening.png', [0.22329, 0.22807, 0.55183, 0.51435]),
  admin_kralicesi: frame('Admin Kraliçesi', '#db2777', '9c7a08ed0_admin-kralicesi.png', 'd2e1f8a97_admin-kralicesi-opening.png', [0.21053, 0.22967, 0.57576, 0.50558]),
  turgay_ates: frame('Turgay Ateş', '#f97316', '8166ccea1_turgay-ates.png', 'c9678074d_turgay-ates-opening.png', [0.22807, 0.24641, 0.54386, 0.51834]),
  ahu: frame('Ahu', '#d4a74d', '0582220e2_ahu.png', '89c122344_ahu-opening.png', [0.20734, 0.20813, 0.58134, 0.5614]),
  kurt_kral: frame('Kurt Kral', '#dc2626', '86ed472f0_kurt-kral.png', '20cb7a1fa_kurt-kral-opening.png', [0.24721, 0.24721, 0.50558, 0.4992]),
  ask: frame('Aşk', '#dc2626', '136ec4ead_ask.png', 'd28df1526_ask-opening.png', [0.22329, 0.21531, 0.56778, 0.57018]),
  kalp: frame('Kalp', '#ef4444', 'd15ef18d7_kalp.png', 'de1d59c0c_kalp-opening.png', [0.2512, 0.25598, 0.50478, 0.50159]),
  ertugrul: frame('Ertuğrul', '#b91c1c', '88f9853d6_ertugrul.png', '656e65db8_ertugrul-opening.png', [0.24322, 0.22967, 0.51356, 0.50239]),
};
export default frameCatalog;