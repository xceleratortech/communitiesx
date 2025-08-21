-- First, update any existing text data to be valid JSON if it's not already
UPDATE "user_profiles" SET "metadata" = '{}' WHERE "metadata" IS NULL OR "metadata" = '';

-- Then convert the column type to jsonb
ALTER TABLE "user_profiles" ALTER COLUMN "metadata" SET DATA TYPE jsonb USING "metadata"::jsonb;

-- Set the default value
ALTER TABLE "user_profiles" ALTER COLUMN "metadata" SET DEFAULT '{}';