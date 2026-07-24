export function BoostedBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-brand-boosted px-2 py-0.5 text-[10px] font-semibold text-brand-dark-green ${className}`}
    >
      ★ Top Ad
    </span>
  )
}
