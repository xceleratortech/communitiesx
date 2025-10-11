-- Manual migration to convert metadata column from text to jsonb
-- This migration handles the conversion safely by ensuring all data is valid JSON

-- Step 1: Ensure all existing metadata is valid JSON
UPDATE "user_profiles" 
SET "metadata" = '{}' 
WHERE "metadata" IS NULL 
   OR "metadata" = '' 
   OR "metadata" = 'null'
   OR NOT ("metadata"::jsonb IS NOT NULL);

-- Step 2: Remove the default constraint first
ALTER TABLE "user_profiles" 
ALTER COLUMN "metadata" DROP DEFAULT;

-- Step 3: Convert the column type to jsonb
ALTER TABLE "user_profiles" 
ALTER COLUMN "metadata" TYPE jsonb 
USING "metadata"::jsonb;

-- Step 4: Set the new default value as jsonb
ALTER TABLE "user_profiles" 
ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;
