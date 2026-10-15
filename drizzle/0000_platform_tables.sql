CREATE TYPE "public"."activity_kind" AS ENUM('signup', 'payment', 'upgrade', 'sms', 'overdue', 'demo');--> statement-breakpoint
CREATE TYPE "public"."demo_status" AS ENUM('new', 'contacted', 'scheduled', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."institute_status" AS ENUM('active', 'trial', 'past_due', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."institute_type" AS ENUM('school', 'college', 'qawmi', 'alia', 'hifz', 'coaching', 'unified');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('paid', 'due', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bKash', 'Nagad', 'Bank');--> statement-breakpoint
CREATE TYPE "public"."plan_key" AS ENUM('trial', 'starter', 'institute', 'campus');--> statement-breakpoint
CREATE TABLE "demo_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "demo_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1001 CACHE 1),
	"name" text NOT NULL,
	"institute_name" text NOT NULL,
	"type" "institute_type" NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"students_range" text,
	"message" text,
	"status" "demo_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "institute_type" NOT NULL,
	"district" text NOT NULL,
	"plan" "plan_key" NOT NULL,
	"status" "institute_status" DEFAULT 'trial' NOT NULL,
	"organization_id" text,
	"mrr_bdt" integer DEFAULT 0 NOT NULL,
	"student_count" integer DEFAULT 0 NOT NULL,
	"staff_count" integer DEFAULT 0 NOT NULL,
	"sms_used" integer DEFAULT 0 NOT NULL,
	"sms_credit" integer DEFAULT 500 NOT NULL,
	"modules" text[] DEFAULT '{}'::text[] NOT NULL,
	"contact_name" text NOT NULL,
	"contact_role" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_email" text NOT NULL,
	"joined_on" date DEFAULT now() NOT NULL,
	"renews_on" date NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "institutes_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"key" "plan_key" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_bdt" integer,
	"student_limit" integer,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"text" text NOT NULL,
	"institute_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"institute_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"amount_bdt" integer NOT NULL,
	"status" "invoice_status" DEFAULT 'due' NOT NULL,
	"method" "payment_method",
	"issued_on" date NOT NULL,
	"paid_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "institutes" ADD CONSTRAINT "institutes_plan_plans_key_fk" FOREIGN KEY ("plan") REFERENCES "public"."plans"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_activity" ADD CONSTRAINT "platform_activity_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demo_requests_status_idx" ON "demo_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "demo_requests_created_idx" ON "demo_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "institutes_status_idx" ON "institutes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "institutes_type_idx" ON "institutes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "platform_activity_created_idx" ON "platform_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "platform_invoices_institute_idx" ON "platform_invoices" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "platform_invoices_period_idx" ON "platform_invoices" USING btree ("period_start");--> statement-breakpoint
CREATE INDEX "platform_invoices_status_idx" ON "platform_invoices" USING btree ("status");