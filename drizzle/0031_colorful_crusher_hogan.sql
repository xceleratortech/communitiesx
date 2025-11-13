ALTER TABLE "qa_answer_comments" DROP CONSTRAINT "qa_answer_comments_parent_id_qa_answer_comments_id_fk";
--> statement-breakpoint
ALTER TABLE "qa_answer_comments" ADD CONSTRAINT "qa_answer_comments_parent_id_qa_answer_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."qa_answer_comments"("id") ON DELETE set null ON UPDATE no action;