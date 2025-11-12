CREATE TABLE "qa_answer_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"answer_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"parent_id" integer,
	"content" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_answer_helpful" (
	"id" serial PRIMARY KEY NOT NULL,
	"answer_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qa_answer_helpful_unique" UNIQUE("answer_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "qa_answer_saves" (
	"id" serial PRIMARY KEY NOT NULL,
	"answer_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qa_answer_save_unique" UNIQUE("answer_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "qa_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qa_answers_post_author_unique" UNIQUE("post_id","author_id")
);
--> statement-breakpoint
CREATE TABLE "qa_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"answers_visible_at" timestamp,
	"allow_edits_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qa_questions_post_id_unique" UNIQUE("post_id")
);
--> statement-breakpoint
ALTER TABLE "qa_answer_comments" ADD CONSTRAINT "qa_answer_comments_answer_id_qa_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."qa_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_answer_comments" ADD CONSTRAINT "qa_answer_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_answer_comments" ADD CONSTRAINT "qa_answer_comments_parent_id_qa_answer_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."qa_answer_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_answer_helpful" ADD CONSTRAINT "qa_answer_helpful_answer_id_qa_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."qa_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_answer_helpful" ADD CONSTRAINT "qa_answer_helpful_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_answer_saves" ADD CONSTRAINT "qa_answer_saves_answer_id_qa_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."qa_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_answer_saves" ADD CONSTRAINT "qa_answer_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_answers" ADD CONSTRAINT "qa_answers_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_answers" ADD CONSTRAINT "qa_answers_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_questions" ADD CONSTRAINT "qa_questions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;