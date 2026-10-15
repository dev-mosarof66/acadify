CREATE TABLE "student_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_access" ADD CONSTRAINT "student_access_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_access" ADD CONSTRAINT "student_access_member_id_institute_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."institute_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_access" ADD CONSTRAINT "student_access_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_access_member_student_idx" ON "student_access" USING btree ("member_id","student_id");--> statement-breakpoint
CREATE INDEX "student_access_student_idx" ON "student_access" USING btree ("student_id");