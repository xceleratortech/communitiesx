CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"mimetype" text NOT NULL,
	"type" text NOT NULL,
	"size" integer DEFAULT 0,
	"r2_key" text NOT NULL,
	"r2_url" text,
	"public_url" text,
	"thumbnail_url" text,
	"uploaded_by" text NOT NULL,
	"post_id" integer,
	"community_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "images" CASCADE;--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "admin_only_posts" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;