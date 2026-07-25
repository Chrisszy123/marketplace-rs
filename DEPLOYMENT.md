# Deployment guide

End-to-end guide to running Marketplace on a single VPS: Postgres, Redis, Meilisearch, MinIO
(object storage), the Rust backend, and the React frontend, all as Docker containers behind a
Caddy reverse proxy that handles TLS automatically.

Every file this guide references (`docker-compose.prod.yml`, `Caddyfile`, `backend/Dockerfile`,
`frontend/Dockerfile`, `.env.example`) is already in the repo and has been built and smoke-tested
(signup → OTP → login → create listing → upload photo → search) as part of putting this guide
together.

## 0. Read this first — what's actually deployable right now

The guide gets you a **fully working free-tier marketplace**: signup/login, phone verification,
listing CRUD with photos, search/browse, and in-app messaging. Two things from the product spec
are not implemented in the codebase yet, so don't expect them after deploying:

- **SMS is not actually sent.** `backend/src/auth/sms.rs` has `LoggingSmsSender`, a dev stand-in
  that writes the OTP code to the backend's logs instead of texting it
  (`docker compose logs backend` is how *you* see codes right now). Real users signing up in
  production will not receive a code. Before letting the public sign up, implement `SmsSender`
  for a real provider (Termii, Twilio, Africa's Talking are reasonable choices for Nigeria) and
  wire it into `main.rs` in place of `LoggingSmsSender`. Until then, this deployment is fine for
  a private beta where you read codes out of the logs for testers.
- **Subscriptions/Paystack billing and the admin console are not built** (Phases 6–7 in
  `CLAUDE.md`). The `subscriptions` table exists in the schema and free-tier listing limits are
  enforced, but there's no billing flow, no webhook handler, and no moderation/admin UI yet.

Everything else — auth, listings, search, messaging — is real and works.

## 1. Architecture

```
                        ┌─────────────┐
  Internet ── 80/443 ──▶│    Caddy    │  (auto TLS via Let's Encrypt)
                        └──────┬──────┘
              ┌────────────────┼─────────────────┐
              ▼                ▼                  ▼
      yourdomain.com   api.yourdomain.com   media.yourdomain.com
              │                │                  │
       ┌──────▼──────┐  ┌──────▼──────┐    ┌──────▼──────┐
       │  frontend   │  │   backend   │    │    minio    │
       │  (nginx,    │  │  (Axum API  │───▶│ (S3-compat, │
       │  static     │  │  + WS)      │    │  public-read│
       │  build)     │  │             │    │  bucket)    │
       └─────────────┘  └──────┬──────┘    └─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
         ┌─────────┐      ┌─────────┐        ┌─────────────┐
         │ postgres│      │  redis  │        │ meilisearch │
         └─────────┘      └─────────┘        └─────────────┘
```

All seven containers run on one Docker network on one VPS. Only Caddy publishes ports (80/443)
to the host — everything else is reachable only from other containers.

**Why one VPS instead of managed services:** the stack is small, self-contained, and every piece
(Postgres, Redis, Meilisearch, MinIO) already runs as a container in the existing dev
`docker-compose.yml`, so this is the least-new-moving-parts way to get a real deployment. If you
outgrow it later, the natural upgrade path is: managed Postgres (Neon/RDS), managed Redis
(Upstash), Meilisearch Cloud, and a real S3-compatible provider (Cloudflare R2 / DigitalOcean
Spaces) instead of self-hosted MinIO — each is a drop-in env var change, nothing in the app code
needs to change.

## 2. Prerequisites

- A domain name you control DNS for.
- A VPS with **at least 2 vCPU / 4GB RAM** (e.g. a $24/mo DigitalOcean droplet or Hetzner CX22).
  Building the Rust backend image is the heavy step (~2–4 min of compiling); on a 1–2GB box it
  can OOM — see the note in §5 if you're stuck on a smaller box.
- Docker + the Docker Compose plugin installed on the VPS (`docker compose version` should work).
- SSH access to the VPS.

## 3. DNS

Point three A records at your VPS's public IP:

| Type | Host                  | Value          |
|------|-----------------------|----------------|
| A    | `yourdomain.com`      | `<VPS_IP>`     |
| A    | `api.yourdomain.com`  | `<VPS_IP>`     |
| A    | `media.yourdomain.com`| `<VPS_IP>`     |

Caddy requests a separate Let's Encrypt certificate per hostname on first boot, so all three need
to resolve *before* you start the stack (DNS propagation is usually minutes, occasionally longer
— `dig yourdomain.com` from your own machine to confirm).

Use the bare apex domain (not `www.`) as your canonical frontend host — the backend's CORS check
only accepts one exact origin (see `CORS_ALLOWED_ORIGIN` below), so pick one and stick with it.

## 4. Server setup

SSH into the VPS, then:

```bash
# Docker + Compose plugin (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh

# Firewall: only SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

git clone <your-repo-url> marketplace
cd marketplace
```

## 5. Configure secrets

```bash
cp .env.example .env
```

Edit `.env` and fill in:

- `DOMAIN` — your apex domain, no `https://`, no trailing slash (e.g. `myapp.com`).
- `CADDY_EMAIL` — any address you control, used for Let's Encrypt renewal notices.
- `POSTGRES_PASSWORD`, `MEILISEARCH_API_KEY`, `JWT_ACCESS_SECRET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY` — generate each with:

  ```bash
  openssl rand -hex 32
  ```

Keep this `.env` file private — it's already covered by `.gitignore` (root-level `/.env`), so
`git status` should never show it as a change to commit.

> **Building on a small VPS:** if `docker compose build` gets OOM-killed on a 1–2GB box, build
> the images elsewhere (your laptop, or a CI job) and push them to a registry (e.g. GHCR) instead
> of building on the server — swap the `build:` blocks in `docker-compose.prod.yml` for `image:`
> pointing at the registry tag. Not needed on a 4GB+ box.

## 6. Launch

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This builds the backend and frontend images, starts Postgres/Redis/Meilisearch/MinIO, waits for
each to report healthy, then starts the backend (which **runs pending sqlx migrations
automatically on boot** — no manual migration step), the frontend, and Caddy last.

First boot takes a few minutes (image builds + Caddy's first certificate request per hostname).
Watch it:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Caddy logs will show certificate issuance for each of the three hostnames; look for
`"certificate obtained successfully"` per domain. If a cert request fails, it's almost always DNS
not having propagated yet — Caddy retries automatically, so give it a few minutes and check
`dig` again.

## 7. Verify

```bash
curl https://api.yourdomain.com/health
# {"status":"ok","database":"ok"}
```

Then open `https://yourdomain.com` in a browser — you should see the homepage over a valid TLS
cert (padlock, no warnings).

**Smoke test the golden path:**

1. Sign up with a real email and any phone number.
2. Get the OTP code from `docker compose -f docker-compose.prod.yml logs backend | grep "dev SMS"`
   (see §0 — this is expected until a real SMS provider is wired in).
3. Verify, log in, post a listing with a photo.
4. Confirm the photo renders (proves the MinIO → `media.yourdomain.com` path works).
5. Search for the listing from a second, logged-out session (proves the Meilisearch sync works).
6. Message the listing from a second account and confirm delivery (proves the WebSocket path
   works through Caddy).

## 8. Day-2 operations

**Deploying an update:**

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Only `backend` and `frontend` get rebuilt (their images changed); the rest are untouched. This
briefly restarts the backend (a few seconds of downtime — there's no rolling/zero-downtime
deploy set up, which is a reasonable gap to leave for now at this scale). Migrations run
automatically on the new backend's boot.

If you changed any `sqlx::query!`/`query_as!` calls in the backend, regenerate the query cache
**before** deploying (it's checked into `backend/.sqlx` and the Docker build uses it offline —
a stale cache means the build either fails or, worse, silently uses a stale query):

```bash
cd backend
DATABASE_URL=postgres://... cargo sqlx prepare   # against a live DB with the new schema
git add .sqlx && git commit
```

**Logs:**

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f caddy
```

**Backups (Postgres is the source of truth — back this up, at minimum):**

```bash
# Ad hoc dump
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U marketplace marketplace | gzip > backup-$(date +%F).sql.gz
```

Put that in a daily cron job and ship the file off-server (S3/R2, `scp` to another host, etc.) —
a backup that only lives on the VPS it's backing up isn't a backup. Also worth periodically
snapshotting the `minio_data` volume (listing photos) and the VPS provider's own disk-snapshot
feature, if it has one.

**Inspecting the database directly** (no port is published for security — tunnel instead):

```bash
ssh -L 5433:localhost:5432 you@your-vps
# then, locally:
psql postgres://marketplace:<POSTGRES_PASSWORD>@localhost:5433/marketplace
```

## 9. Known limitations at this scale

- **Single backend instance only.** Real-time message delivery (`ws.rs`) keeps its registry of
  connected sockets in-process memory, not Redis — running more than one backend replica would
  mean a message only reaches the recipient if they're connected to the *same* instance. The
  frontend already has a polling fallback for when the socket is unavailable, so this degrades
  gracefully rather than breaking, but don't scale `backend` horizontally without moving that
  registry to Redis pub/sub first. Everything else (rate limiting, sessions) is already
  Redis-backed and scales fine.
- **Self-hosted MinIO behind Caddy** is simple and works, but a managed object store (Cloudflare
  R2, DigitalOcean Spaces) gives you real durability guarantees and a CDN in front of listing
  photos — worth moving to once this isn't just a beta.
- No automated backups, no rolling deploys, no monitoring/alerting are set up. Fine for getting a
  real product in front of real users; revisit before it matters if it goes down at 3am.

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Caddy stuck retrying certs | DNS hasn't propagated yet, or port 80/443 isn't reachable (check `ufw`, and your VPS provider's own firewall/security-group if it has one separate from `ufw`) |
| `docker compose build` killed / exit 137 | Out of memory during the Rust compile — see the small-VPS note in §5 |
| Backend won't start, logs show `missing required environment variable` | A value in `.env` is empty/missing — re-check against `.env.example` |
| CORS errors in the browser console | `CORS_ALLOWED_ORIGIN` (derived from `DOMAIN` in compose) doesn't exactly match the origin the frontend is served from — check for a `www.` mismatch |
| Photos upload but don't render | `media.yourdomain.com` DNS/cert issue, or `S3_PUBLIC_URL_BASE` mismatch — check `docker compose logs caddy` for that hostname |
| sqlx build failure in Docker | `.sqlx` cache is stale relative to the queries in `src/` — see the redeploy note in §8 |
