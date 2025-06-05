-- Create chat_threads table
CREATE TABLE IF NOT EXISTS "chat_threads" (
    "id" serial PRIMARY KEY,
    "user1_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "user2_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "org_id" text NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
    "last_message_at" timestamp NOT NULL DEFAULT now(),
    "last_message_preview" text,
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS "direct_messages" (
    "id" serial PRIMARY KEY,
    "thread_id" integer NOT NULL REFERENCES "chat_threads"("id") ON DELETE CASCADE,
    "sender_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "recipient_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "is_read" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "chat_threads_user1_id_idx" ON "chat_threads" ("user1_id");
CREATE INDEX IF NOT EXISTS "chat_threads_user2_id_idx" ON "chat_threads" ("user2_id");
CREATE INDEX IF NOT EXISTS "chat_threads_org_id_idx" ON "chat_threads" ("org_id");
CREATE INDEX IF NOT EXISTS "chat_threads_last_message_at_idx" ON "chat_threads" ("last_message_at" DESC);

CREATE INDEX IF NOT EXISTS "direct_messages_thread_id_idx" ON "direct_messages" ("thread_id");
CREATE INDEX IF NOT EXISTS "direct_messages_sender_id_idx" ON "direct_messages" ("sender_id");
CREATE INDEX IF NOT EXISTS "direct_messages_recipient_id_idx" ON "direct_messages" ("recipient_id");
CREATE INDEX IF NOT EXISTS "direct_messages_created_at_idx" ON "direct_messages" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "direct_messages_is_read_idx" ON "direct_messages" ("is_read");

-- Add a composite index for faster thread lookup
CREATE INDEX IF NOT EXISTS "chat_threads_user_pair_idx" ON "chat_threads" ("user1_id", "user2_id"); 