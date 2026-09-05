export default function SubscriptionUserRow({ user, selected, onToggle }) {
  const end = user.membership_end || user.subscription_end_date;
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#16161e] p-3 cursor-pointer">
      <input type="checkbox" checked={selected} onChange={() => onToggle(user.id)} className="h-4 w-4 accent-purple-600" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{user.username || user.full_name || user.email}</p>
        <p className="truncate text-xs text-gray-400">{user.email}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-green-400">Aktif</p>
        <p className="text-[11px] text-gray-400">{end ? new Date(end).toLocaleDateString('tr-TR') : 'Süresiz'}</p>
      </div>
    </label>
  );
}