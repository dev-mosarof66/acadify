CREATE TYPE "public"."fee_bill_status" AS ENUM('due', 'partial', 'paid', 'waived');--> statement-breakpoint
CREATE TYPE "public"."fee_frequency" AS ENUM('monthly', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."fee_payment_method" AS ENUM('cash', 'bkash', 'nagad', 'rocket', 'bank');--> statement-breakpoint
CREATE TABLE "fee_bill_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"fee_head_id" uuid,
	"label" text NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"bill_no" text NOT NULL,
	"title" text NOT NULL,
	"month" text,
	"total" integer NOT NULL,
	"paid" integer DEFAULT 0 NOT NULL,
	"status" "fee_bill_status" DEFAULT 'due' NOT NULL,
	"due_date" date NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_head_amounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fee_head_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_heads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_bn" text DEFAULT '' NOT NULL,
	"frequency" "fee_frequency" DEFAULT 'monthly' NOT NULL,
	"amount" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"receipt_no" text NOT NULL,
	"amount" integer NOT NULL,
	"method" "fee_payment_method" DEFAULT 'cash' NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"received_by" text NOT NULL,
	"received_by_name" text NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fee_bill_items" ADD CONSTRAINT "fee_bill_items_bill_id_fee_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."fee_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_bill_items" ADD CONSTRAINT "fee_bill_items_fee_head_id_fee_heads_id_fk" FOREIGN KEY ("fee_head_id") REFERENCES "public"."fee_heads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_bills" ADD CONSTRAINT "fee_bills_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_bills" ADD CONSTRAINT "fee_bills_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_head_amounts" ADD CONSTRAINT "fee_head_amounts_fee_head_id_fee_heads_id_fk" FOREIGN KEY ("fee_head_id") REFERENCES "public"."fee_heads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_head_amounts" ADD CONSTRAINT "fee_head_amounts_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_heads" ADD CONSTRAINT "fee_heads_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payment_allocations" ADD CONSTRAINT "fee_payment_allocations_payment_id_fee_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."fee_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payment_allocations" ADD CONSTRAINT "fee_payment_allocations_bill_id_fee_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."fee_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fee_bills_institute_no_idx" ON "fee_bills" USING btree ("institute_id","bill_no");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_bills_student_month_idx" ON "fee_bills" USING btree ("student_id","month") WHERE "fee_bills"."month" is not null;--> statement-breakpoint
CREATE INDEX "fee_bills_institute_status_idx" ON "fee_bills" USING btree ("institute_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_head_amounts_head_class_idx" ON "fee_head_amounts" USING btree ("fee_head_id","class_id");--> statement-breakpoint
CREATE INDEX "fee_heads_institute_idx" ON "fee_heads" USING btree ("institute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_payments_institute_receipt_idx" ON "fee_payments" USING btree ("institute_id","receipt_no");--> statement-breakpoint
CREATE INDEX "fee_payments_institute_paid_idx" ON "fee_payments" USING btree ("institute_id","paid_at");