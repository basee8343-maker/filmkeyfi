export const STATUS_LABELS = {
  new: 'Yeni',
  reviewing: 'İnceleniyor',
  answered: 'Cevaplandı',
  closed: 'Kapatıldı',
};

export const STATUS_COLORS = {
  new: 'text-amber-400',
  reviewing: 'text-blue-400',
  answered: 'text-green-400',
  closed: 'text-muted-foreground',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}