import { Image } from '@/components/ui/image';

export const ACCOUNT_STATES = {
  deleted: {
    image: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/0665aaba3_generated_image.png',
    name: 'Silinmiş Hesap',
    message: 'Bu hesap yönetici tarafından silinmiştir.'
  },
  banned: {
    image: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/63e635ef8_generated_image.png',
    name: 'Engellenmiş Hesap',
    message: 'Bu hesap yönetici tarafından engellenmiştir.'
  },
  suspended: {
    image: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/d59dc5667_generated_image.png',
    name: 'Askıya Alınmış Hesap',
    message: 'Bu hesap yönetici tarafından askıya alınmıştır.'
  }
};

export function getAccountState(profile, fallbackText = '') {
  const fallback = Object.entries(ACCOUNT_STATES).find(([, state]) => state.name === fallbackText || state.message === fallbackText);
  if (fallback) return ACCOUNT_STATES[fallback[0]];
  const status = profile?.account_status;
  return status && status !== 'active' ? ACCOUNT_STATES[status] : null;
}

export default function AccountStatusAvatar({ status, className = 'h-12 w-12' }) {
  const state = ACCOUNT_STATES[status] || ACCOUNT_STATES.deleted;
  return <Image src={state.image} alt={state.name} className={`${className} rounded-full border border-border`} fittingType="fill" />;
}