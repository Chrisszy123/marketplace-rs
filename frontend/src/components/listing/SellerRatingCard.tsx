interface SellerRatingCardProps {
  rating: number | null
}

/** `rating` is always null right now — Phase 7 (ratings) hasn't shipped — so this renders an
 * honest "no ratings yet" state rather than a fabricated score. */
export function SellerRatingCard({ rating }: SellerRatingCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-card">
      {rating != null ? (
        <>
          <p className="text-display text-brand-dark-green">{rating.toFixed(1)}</p>
          <p className="text-caption text-brand-dark/55">out of 5</p>
        </>
      ) : (
        <>
          <p className="text-h3 text-brand-dark-green">No ratings yet</p>
          <p className="mt-1 text-caption text-brand-dark/55">This seller hasn't been rated.</p>
        </>
      )}
    </div>
  )
}
