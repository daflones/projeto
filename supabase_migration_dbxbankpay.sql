-- Migration: Add DBXBankPay gateway columns + missing columns to pix_payments
-- Run this SQL in Supabase Dashboard > SQL Editor

-- Columns used by paymentService.ts (may already exist)
ALTER TABLE pix_payments
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_name TEXT;

-- New columns for DBXBankPay integration
ALTER TABLE pix_payments
  ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_pix_payments_external_reference
  ON pix_payments (external_reference);

CREATE INDEX IF NOT EXISTS idx_pix_payments_gateway_transaction_id
  ON pix_payments (gateway_transaction_id);
