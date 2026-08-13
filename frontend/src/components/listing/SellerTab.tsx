import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import type { SellerSummary } from '../../api/types'

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

interface SellerTabProps {
  seller: SellerSummary
}

/**
 * Reviews attach to a seller, not a listing (a one-off couch sale doesn't accumulate its own
 * review history — the seller's reputation does). No reviews backend exists yet (Phase 7 —
 * trust & safety — hasn't shipped, per CLAUDE.md's phase order), so this is an honest empty
 * state rather than fabricated stars.
 */
export function SellerTab({ seller }: SellerTabProps) {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card sm:p-5">
        <Avatar name={seller.display_name} url={seller.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-body font-semibold text-brand-dark-green">{seller.display_name}</p>
            {seller.phone_verified && <Badge variant="verified">Verified</Badge>}
          </div>
          <p className="text-body-sm text-brand-dark/55">Member since {formatMemberSince(seller.member_since)}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-label text-brand-dark/45">Reviews</p>
        <EmptyState
          className="shadow-none"
          title="No reviews yet for this seller."
          body="Reviews show up here once buyers who've dealt with this seller leave feedback."
        />
      </div>
    </div>
  )
}
