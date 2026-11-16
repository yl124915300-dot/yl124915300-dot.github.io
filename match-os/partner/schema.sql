-- MATCH OS private D1. Never put credentials, email, checkout URL or voucher codes here.
-- Only anonymized purchase decisions and merchant reference IDs.
CREATE TABLE IF NOT EXISTS partner_decisions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN (
    'CREATING', 'READY', 'PRICE_CHANGED', 'UNCERTAIN_STOP', 'UNCONFIRMED',
    'ITEM_MISMATCH', 'CONFIRMED', 'REDEEMED', 'REFUNDED', 'REJECTED',
    'CANCELLED', 'EXPIRED', 'ON_HOLD', 'PENDING', 'UNKNOWN'
  )),
  product_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  agreed_price INTEGER NOT NULL CHECK (agreed_price >= 0),
  cart_id TEXT UNIQUE,
  order_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_partner_decisions_status ON partner_decisions(status, created_at);
