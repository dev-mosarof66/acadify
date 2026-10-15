CREATE TYPE "public"."hifz_rating" AS ENUM('mumtaz', 'jayyid_jiddan', 'jayyid', 'maqbul', 'needs_work');--> statement-breakpoint
CREATE TABLE "hifz_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"date" date NOT NULL,
	"sabak" text DEFAULT '' NOT NULL,
	"sabak_para" integer,
	"sabki" text DEFAULT '' NOT NULL,
	"dour" text DEFAULT '' NOT NULL,
	"rating" "hifz_rating",
	"note" text DEFAULT '' NOT NULL,
	"teacher_id" text NOT NULL,
	"teacher_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hifz_paras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"para" integer NOT NULL,
	"completed_on" date NOT NULL,
	"marked_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hifz_logs" ADD CONSTRAINT "hifz_logs_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hifz_logs" ADD CONSTRAINT "hifz_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hifz_paras" ADD CONSTRAINT "hifz_paras_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hifz_logs_student_date_idx" ON "hifz_logs" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "hifz_logs_institute_date_idx" ON "hifz_logs" USING btree ("institute_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "hifz_paras_student_para_idx" ON "hifz_paras" USING btree ("student_id","para");