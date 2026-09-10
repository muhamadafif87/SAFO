-- SAFO Supabase Database Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For radius search

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'mitra', 'customer');
CREATE TYPE user_status AS ENUM ('active', 'suspended');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE product_status AS ENUM ('active', 'sold_out', 'expired', 'inactive');
CREATE TYPE order_status AS ENUM ('pending_payment', 'paid', 'ready', 'ready_for_pickup', 'completed', 'cancelled', 'expired');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE payment_provider AS ENUM ('midtrans', 'xendit', 'mock');
CREATE TYPE payout_status AS ENUM ('requested', 'processed', 'rejected');
CREATE TYPE payment_method AS ENUM ('ewallet', 'bank_transfer', 'qris');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mitra Profiles
CREATE TABLE mitra_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    legal_doc_url TEXT,
    photo_url TEXT,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mitra_location ON mitra_profiles USING GIST (location);

-- Operational Hours
CREATE TABLE operational_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mitra_id UUID NOT NULL REFERENCES mitra_profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    UNIQUE(mitra_id, day_of_week)
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mitra_id UUID NOT NULL REFERENCES mitra_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    photo_url TEXT,
    original_price DECIMAL(12, 2) NOT NULL,
    discount_price DECIMAL(12, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    pickup_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status product_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id),
    mitra_id UUID NOT NULL REFERENCES mitra_profiles(id),
    pickup_code VARCHAR(10) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    platform_fee DECIMAL(12, 2) NOT NULL DEFAULT 1000,
    status order_status NOT NULL DEFAULT 'pending_payment',
    payment_method payment_method,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    qty INT NOT NULL,
    price_at_purchase DECIMAL(12, 2) NOT NULL
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider payment_provider NOT NULL DEFAULT 'mock',
    provider_ref_id VARCHAR(255),
    status payment_status NOT NULL DEFAULT 'pending',
    snap_token VARCHAR(255),
    payment_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Status Logs
CREATE TABLE order_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status order_status,
    to_status order_status NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payouts
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mitra_id UUID NOT NULL REFERENCES mitra_profiles(id),
    amount DECIMAL(12, 2) NOT NULL,
    status payout_status NOT NULL DEFAULT 'requested',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id)
);

-- Platform Settings (For Admin configuration)
CREATE TABLE platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial default settings
INSERT INTO platform_settings (key, value) VALUES 
('business_rules', '{"platformFeeCustomer": 500, "platformFeeMitra": 500, "minimumDiscount": 30, "serviceRadiusKm": 10}');
