CREATE TYPE "public"."institute_role" AS ENUM('principal', 'institute_admin', 'accountant', 'teacher', 'student', 'guardian');--> statement-breakpoint
CREATE TABLE "institute_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"institute_id" uuid NOT NULL,
	"role" "institute_role" NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "institute_members" ADD CONSTRAINT "institute_members_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "institute_members_user_institute_idx" ON "institute_members" USING btree ("user_id","institute_id");--> statement-breakpoint
CREATE INDEX "institute_members_institute_idx" ON "institute_members" USING btree ("institute_id");