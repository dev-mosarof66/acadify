CREATE TYPE "public"."ai_approval_decision" AS ENUM('approved', 'edited', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ai_job_kind" AS ENUM('question_paper');--> statement-breakpoint
CREATE TYPE "public"."ai_job_status" AS ENUM('queued', 'running', 'awaiting_approval', 'approved', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."question_source" AS ENUM('teacher', 'ai_approved');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('mcq', 'cq');--> statement-breakpoint
CREATE TABLE "ai_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"decision" "ai_approval_decision" NOT NULL,
	"final_output" jsonb,
	"note" text DEFAULT '' NOT NULL,
	"decided_by" text NOT NULL,
	"decided_by_name" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"kind" "ai_job_kind" NOT NULL,
	"status" "ai_job_status" DEFAULT 'queued' NOT NULL,
	"title" text NOT NULL,
	"params" jsonb NOT NULL,
	"output" jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_sheet_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_bdt" numeric(10, 2) DEFAULT 0 NOT NULL,
	"requested_by" text NOT NULL,
	"requested_by_name" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_bank_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"chapter" text DEFAULT '' NOT NULL,
	"type" "question_type" NOT NULL,
	"language" text DEFAULT 'bn' NOT NULL,
	"body" jsonb NOT NULL,
	"marks" integer NOT NULL,
	"source" "question_source" NOT NULL,
	"job_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "ai_credit_bdt" integer;--> statement-breakpoint
ALTER TABLE "ai_approvals" ADD CONSTRAINT "ai_approvals_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_approvals" ADD CONSTRAINT "ai_approvals_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_approvals_job_idx" ON "ai_approvals" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "ai_jobs_institute_created_idx" ON "ai_jobs" USING btree ("institute_id","created_at");--> statement-breakpoint
CREATE INDEX "question_bank_institute_subject_idx" ON "question_bank_items" USING btree ("institute_id","subject_id");