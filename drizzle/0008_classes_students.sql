CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."shift" AS ENUM('morning', 'day', 'evening');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('active', 'left', 'graduated');--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_bn" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"shift" "shift" DEFAULT 'day' NOT NULL,
	"capacity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_code" text NOT NULL,
	"name" text NOT NULL,
	"name_bn" text DEFAULT '' NOT NULL,
	"gender" "gender" NOT NULL,
	"date_of_birth" date,
	"class_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"roll" integer NOT NULL,
	"guardian_name" text NOT NULL,
	"guardian_relation" text DEFAULT '' NOT NULL,
	"guardian_phone" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"photo_key" text,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"admitted_on" date DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "classes_institute_name_idx" ON "classes" USING btree ("institute_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_class_name_shift_idx" ON "sections" USING btree ("class_id","name","shift");--> statement-breakpoint
CREATE INDEX "sections_institute_idx" ON "sections" USING btree ("institute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_institute_code_idx" ON "students" USING btree ("institute_id","student_code");--> statement-breakpoint
CREATE UNIQUE INDEX "students_section_roll_active_idx" ON "students" USING btree ("section_id","roll") WHERE "students"."status" = 'active';--> statement-breakpoint
CREATE INDEX "students_institute_class_idx" ON "students" USING btree ("institute_id","class_id");