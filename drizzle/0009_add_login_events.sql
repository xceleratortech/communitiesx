-- Add login_events table for login history tracking
CREATE TABLE IF NOT EXISTS login_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);
