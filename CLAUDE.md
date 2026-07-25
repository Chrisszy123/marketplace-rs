# Marketplace

"Marketplace" is a horizontal classifieds/marketplace web app (think Jiji.com) where buyers and
sellers connect to trade any kind of goods or services. It is a connection layer, not a
checkout/escrow platform: buyers and sellers arrange the actual transaction themselves; the
platform's job is discovery, listing management, messaging, and seller monetization.

## Core model

- Any user can be both a buyer and a seller (single account type).
- Sellers post listings for free, with limits (max concurrent active listings, standard search
  placement).
- Listings are active for 30 days, then expire (hidden from search but editable/renewable, not
  deleted).
- Sellers can pay a monthly subscription to unlock: top-of-search placement, a
  "featured/verified" badge, higher/unlimited concurrent listings, and auto-renewal instead of
  manual relisting.
- Buyers search/browse by category, location, and price, message sellers in-app, and can
  save/favorite listings.

## Tech stack (decided — flag before deviating)

- Backend: Rust, Axum web framework, sqlx for Postgres access (compile-time query checking),
  tokio async runtime.
- Frontend: React + TypeScript, Vite, Tailwind CSS.
- Primary DB: PostgreSQL (source of truth — users, listings, messages, subscriptions,
  transactions).
- Search/browse engine: Meilisearch, synced from Postgres on listing create/update/expire.
- Cache/sessions/rate-limiting: Redis.
- Payments: Paystack, called directly via their REST API using `reqwest` + `serde` — no SDK, no
  Node.js sidecar. Initialize-transaction, subscription plan/charge flow, and webhook signature
  verification (HMAC-SHA512) implemented ourselves.
- Auth: email/password + phone verification (OTP), JWT-based sessions, refresh tokens in
  httpOnly cookies.
- Pagination: cursor-based everywhere listings are browsed/scrolled — no offset/limit
  pagination.

## Branding (Tailwind theme tokens, not raw hex in components)

- Primary action green: `#4CB311`
- Light neutral / background: `#EFF9F2` (alternate warm cream neutral: `#fefcf7`)
- Dark neutrals: `#0B2602`, `#1E1E1E`, `#17381b`
- Boosted/featured accent: `#E5DD7C` (pale yellow) — used with the primary green for
  "Top Ad"/"Featured" badges specifically, so boosted placement has a distinct, consistent
  visual identity across listing cards, search results, and seller profiles.
- Typeface: Host Grotesk (fallback to closest licensed Google Fonts equivalent if unavailable —
  flag if so).
- Logo mark: a custom "M" enclosing a shopping-bag silhouette with a hidden "P" in its negative
  space. Real assets are in `frontend/public/SVG` and `frontend/public/PNG` (horizontal/vertical
  lockups × black/white/mono, plus an icon-only mark); use the `Logo` component
  (`frontend/src/components/ui/Logo.tsx`) rather than referencing the files directly.

## Non-negotiable engineering standards

- Every listing query the user might scroll through (search results, category browse,
  "my listings") must be cursor-paginated.
- All money amounts stored as integers (smallest currency unit, e.g. kobo) — never floats.
- Webhook endpoints must verify Paystack's signature before trusting payload contents.
- `.env.example` documents every required environment variable — never commit real secrets.
- Every schema change ships as an sqlx migration — no manual schema edits.
- Basic integration tests for auth, listing CRUD, and the subscription webhook handler before
  considering a phase "done."

## Working style

- Work in phases, one at a time. At the end of each phase: what was built, how to run/test it,
  and what decisions need sanity-checking.
- If something is ambiguous, or a different technical choice is clearly better, stop and ask —
  don't silently deviate from the stack above.
- Prefer boring, well-documented crates/packages over clever or bleeding-edge ones.

## Environment notes

- Node: pin to 20 LTS via nvm for the frontend (`.nvmrc` in `/frontend`). The system default via
  nvm was 16.20.0, which is too old for Vite 5 / current Tailwind tooling.

## Phases

1. **Foundations** — Rust/Axum workspace, React/Vite/Tailwind frontend, docker-compose
   (Postgres/Redis/Meilisearch), initial migrations (users, listings, categories, subscriptions,
   messages, reports) with explicit lifecycle fields, health-check endpoint, test scaffolding.
2. **Auth & user accounts** — signup/login, phone OTP (SMS behind a trait, logged in dev), JWT +
   httpOnly refresh cookies, profile, Redis-backed rate limiting.
3. **Listings CRUD + lifecycle** — goods vs. services fields, category taxonomy, photo upload
   (MinIO in dev), 30-day expiry job + renew, free-tier concurrent listing limits.
4. **Search & discovery** — Meilisearch sync, filtered/sorted search with boosted "Top Ad"
   ranking, cursor pagination, homepage/browse/search/detail frontend.
5. **Messaging** — per-listing buyer↔seller threads in Postgres, WebSocket delivery with
   polling fallback, quick-reply template.
6. **Subscriptions & Paystack** — direct REST integration (init/verify/subscribe), signature-
   verified webhook handling, tier enforcement in listings/search, billing UI via Paystack
   hosted checkout.
7. **Trust & safety + admin** — reports with reason codes, post-interaction ratings, role-gated
   admin console (moderation queue, category management, revenue overview, manual
   feature/unfeature).

Don't skip ahead — later phases assume earlier ones exist and are tested. Where a phase says to
flag or ask about a decision, actually stop and get an answer before continuing.
