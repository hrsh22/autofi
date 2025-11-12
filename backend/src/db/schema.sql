-- Track files uploaded to Filecoin
-- Simplified: No balance tracking, just direct payment per upload
CREATE TABLE IF NOT EXISTS user_files (
    id TEXT PRIMARY KEY,
    user_address TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash TEXT NOT NULL,
    commp TEXT,
    provider_id TEXT,
    bridge_request_id TEXT,          -- OnlySwaps bridge transaction ID
    payment_amount TEXT,              -- 0.1 USDFC per upload
    uploaded_at INTEGER
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_files_address ON user_files(user_address);
CREATE INDEX IF NOT EXISTS idx_user_files_commp ON user_files(commp);

