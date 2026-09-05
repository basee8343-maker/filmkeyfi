const base = 'https://base44.app/api/apps/6a77d66e4da6de214628ee62/files/mp/public/6a77d66e4da6de214628ee62/';
const frame = (label, color, image, opening, group = 'normal') => ({ label, color, image_url: image.startsWith('http') ? image : base + image, opening, prepared: true, group });

const frameCatalog = {
  galatasaray: frame('Galatasaray', '#ED1C24', '06a5eb02d_galatasaray-seffaf.png', [0.2424, 0.25835, 0.52716, 0.48889]),
  fenerbahce: frame('Fenerbahçe', '#facc15', '5a4188b19_fenerbahce-seffaf.png', [0.23363, 0.26632, 0.53434, 0.4857]),
  besiktas: frame('Beşiktaş', '#e5e7eb', 'e46169359_besiktas-seffaf.png', [0.2105, 0.22964, 0.58777, 0.55428]),
  trabzonspor: frame('Trabzonspor', '#6B0C72', '773afc1ea_trabzonspor-seffaf.png', [0.22087, 0.23283, 0.56066, 0.51122]),
  admin_yardimcisi: frame('Admin Yardımcısı', '#1d4ed8', 'b685c98f7_admin-yardimcisi.png', [0.20494, 0.22568, 0.58931, 0.50399]),
  admin_mavi_kirmizi: frame('Admin', '#e11d48', '9919c4134_admin.png', [0.20734, 0.2177, 0.58453, 0.54705]),
  turgay: frame('Turgay Mavi', '#1565c0', '0e9d1406c_turgay-mavi.png', [0.22329, 0.22807, 0.55183, 0.51435]),
  admin_kralicesi: frame('Admin Kraliçesi', '#db2777', '9c7a08ed0_admin-kralicesi.png', [0.21053, 0.22967, 0.57576, 0.50558]),
  turgay_ates: frame('Turgay Ateş', '#f97316', '8166ccea1_turgay-ates.png', [0.22807, 0.24641, 0.54386, 0.51834]),
  ahu: frame('Ahu', '#d4a74d', '0582220e2_ahu.png', [0.20734, 0.20813, 0.58134, 0.5614]),
  kurt_kral: frame('Kurt Kral', '#dc2626', '86ed472f0_kurt-kral.png', [0.24721, 0.24721, 0.50558, 0.4992]),
  ask: frame('Aşk', '#dc2626', '136ec4ead_ask.png', [0.22329, 0.21531, 0.56778, 0.57018]),
  kalp: frame('Kalp', '#ef4444', 'd15ef18d7_kalp.png', [0.2512, 0.25598, 0.50478, 0.50159]),
  ertugrul: frame('Ertuğrul', '#b91c1c', '88f9853d6_ertugrul.png', [0.24322, 0.22967, 0.51356, 0.50239]),
  zengin: frame('Zengin', '#ef4444', '2f871912e_zengin-seffaf.png', [0.19136, 0.22645, 0.61568, 0.66911]),
  vip: frame('VIP', '#ef4444', '589f36312_vip-seffaf.png', [0.21688, 0.2121, 0.56464, 0.54072]),
  kral: frame('Kral', '#dc2626', '57f239b30_kral-seffaf.png', [0.22167, 0.22964, 0.55428, 0.5463]),
  ates: frame('Ateş', '#f97316', '5dbecd3da_ates-seffaf.png', [0.19375, 0.18977, 0.61169, 0.62126]),
  lvl_75: frame('LVL 75', '#7c3aed', 'f2094c6cc_lvl_75-seffaf.png', [0.21449, 0.23841, 0.57102, 0.53753], 'level'),
  lvl_150: frame('LVL 150', '#0d9488', 'b9a34f37d_lvl_150-seffaf.png', [0.2113, 0.22246, 0.57661, 0.53992], 'level'),
  lvl_250: frame('LVL 250', '#6d28d9', '1da85bef5_lvl_250-seffaf.png', [0.21927, 0.2408, 0.56145, 0.53035], 'level'),
  lvl_500: frame('LVL 500', '#65a30d', '7730a2c7e_lvl_500-seffaf.png', [0.22246, 0.24878, 0.55268, 0.52158], 'level'),
  lvl_750: frame('LVL 750', '#7c3aed', 'ff98164e6_lvl_750-seffaf.png', [0.24878, 0.2727, 0.50165, 0.49367], 'level'),
  lvl_max: frame('LVL MAX', '#dc2626', '22c399687_lvl_max-seffaf.png', [0.23761, 0.26473, 0.52397, 0.49766], 'level'),
};
export default frameCatalog;