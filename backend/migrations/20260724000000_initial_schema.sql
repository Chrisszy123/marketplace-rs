-- Initial schema: users, categories, subscriptions, listings, messages, reports.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    phone_verified_at TIMESTAMPTZ,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    location TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES categories (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent_id ON categories (parent_id);

-- One row per user; upgraded from 'free' via the Paystack webhook flow (Phase 6).
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (
        status IN ('inactive', 'active', 'past_due', 'cancelled')
    ),
    paystack_customer_code TEXT,
    paystack_subscription_code TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- listing_type distinguishes goods (condition applies) from services (service_area applies).
-- Lifecycle is explicit: status is the source of truth, expires_at drives the sweep job that
-- transitions active -> expired; renewal resets published_at/expires_at rather than mutating
-- created_at.
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories (id),
    listing_type TEXT NOT NULL CHECK (listing_type IN ('good', 'service')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_kobo BIGINT NOT NULL CHECK (price_kobo >= 0),
    currency TEXT NOT NULL DEFAULT 'NGN',
    location TEXT NOT NULL,
    condition TEXT CHECK (condition IN ('new', 'used')),
    service_area TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'expiring', 'expired', 'sold', 'paused')
    ),
    is_boosted BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (listing_type = 'good' AND service_area IS NULL)
        OR (listing_type = 'service' AND condition IS NULL)
    )
);

CREATE INDEX idx_listings_seller_id ON listings (seller_id);
CREATE INDEX idx_listings_category_id ON listings (category_id);
CREATE INDEX idx_listings_status ON listings (status);
CREATE INDEX idx_listings_expires_at ON listings (expires_at);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_listing_id ON messages (listing_id);
CREATE INDEX idx_messages_recipient_id ON messages (recipient_id);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings (id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    reason_code TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'actioned', 'dismissed')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (listing_id IS NOT NULL OR reported_user_id IS NOT NULL)
);

CREATE INDEX idx_reports_status ON reports (status);
