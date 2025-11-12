-- User credit balances (never expire)
CREATE TABLE IF NOT EXISTS user_credits (
    user_address TEXT PRIMARY KEY,
    balance TEXT NOT NULL,  -- USDFC in wei (bigint as string)
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Credit transaction history (deposits and deductions)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_address TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'deposit' or 'deduct'
    amount TEXT NOT NULL,  -- USDFC in wei (bigint as string)
    file_id TEXT,  -- Foreign key to user_files (nullable)
    bridge_request_id TEXT,  -- OnlySwaps bridge ID (nullable)
    description TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);

-- Track files uploaded to Filecoin
-- Credit-based: users fund account, then credits are deducted per upload
CREATE TABLE IF NOT EXISTS user_files (
    id TEXT PRIMARY KEY,
    user_address TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash TEXT NOT NULL,
    commp TEXT,
    provider_id TEXT,
    storage_duration_days INTEGER NOT NULL,
    storage_cost TEXT NOT NULL,  -- USDFC in wei (bigint as string)
    uploaded_at INTEGER
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_files_address ON user_files(user_address);
CREATE INDEX IF NOT EXISTS idx_user_files_commp ON user_files(commp);

