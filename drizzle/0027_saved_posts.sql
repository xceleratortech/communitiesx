CREATE TABLE IF NOT EXISTS "saved_posts" (
    "user_id" text NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    "post_id" integer NOT NULL REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "saved_posts_user_id_post_id_pk" PRIMARY KEY ("user_id", "post_id")
);

