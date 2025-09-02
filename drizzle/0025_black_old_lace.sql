ALTER TABLE "user_profiles" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "metadata" SET DEFAULT '{}';