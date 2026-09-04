import { Image } from '@/components/ui/image';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      {Icon && <div className="w-16 h-16 rounded-full bg-[#16161e] flex items-center justify-center mb-4"><Icon className="w-8 h-8 text-purple-400/60" /></div>}
      <h3 className="text-lg font-bold mb-1 text-white">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-[#16161e] border border-white/5 overflow-hidden">
          <div className="aspect-[2/3] bg-[#1c1c24] animate-pulse" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 bg-[#1c1c24] rounded animate-pulse w-3/4" />
            <div className="h-2 bg-[#1c1c24] rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}