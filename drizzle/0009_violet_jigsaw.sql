ALTER TABLE "orgs" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "orgs" ADD COLUMN "created_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_slug_unique" UNIQUE("slug");