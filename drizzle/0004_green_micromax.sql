ALTER TABLE "comments" DROP CONSTRAINT "comments_parent_id_comments_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;