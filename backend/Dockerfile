##
## Build stage — compiles a release binary using the checked-in sqlx query cache (.sqlx), so no
## live database connection is needed at image build time.
##
FROM rust:1-slim-bookworm AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends pkg-config ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY .sqlx ./.sqlx
COPY migrations ./migrations
COPY src ./src

ENV SQLX_OFFLINE=true
RUN cargo build --release

##
## Runtime stage — small Debian base with just the compiled binary and CA certs (needed for any
## outbound HTTPS calls, e.g. a future Paystack integration).
##
FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --no-create-home appuser

COPY --from=builder /app/target/release/marketplace-backend /app/marketplace-backend
COPY --from=builder /app/migrations /app/migrations

USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/marketplace-backend"]
