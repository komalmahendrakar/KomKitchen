-- 001_create_tables.sql
-- Live Kitchen Operations Database Schema

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema Migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sequence Tracker for strictly monotonic real-time event ordering
CREATE TABLE IF NOT EXISTS sequence_tracker (
    id INT PRIMARY KEY DEFAULT 1,
    current_val BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT single_row_tracker CHECK (id = 1)
);

INSERT INTO sequence_tracker (id, current_val)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Menu Items Table
-- Enforces nonnegative stock and valid positive price
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL CHECK (stock >= 0),
    category VARCHAR(64) DEFAULT 'general',
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
-- Enforces unique client_request_id for atomic idempotency
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_request_id VARCHAR(128) UNIQUE NOT NULL,
    customer_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('NEW', 'COOKING', 'READY', 'PICKED_UP', 'CANCELLED')),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
-- Snapshots unit price and item name at order time to preserve financial records
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- Order Status History Table
-- Audit trail tracking state transitions
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
