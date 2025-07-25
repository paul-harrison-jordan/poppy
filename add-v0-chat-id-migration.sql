-- Migration: Add v0-chat-id column to PRDs table
-- This allows us to store the V0 chat session ID to enable continued editing of designs

ALTER TABLE prds ADD COLUMN IF NOT EXISTS "v0-chat-id" TEXT DEFAULT '';

-- Create index for performance when querying by chat ID
CREATE INDEX IF NOT EXISTS idx_prds_v0_chat_id ON prds("v0-chat-id");