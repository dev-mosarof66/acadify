CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"trial_days" integer DEFAULT 30 NOT NULL,
	"payment_instructions" text DEFAULT '' NOT NULL,
	"support_email" text DEFAULT 'support@acadify.app' NOT NULL,
	"sales_email" text DEFAULT 'sales@acadify.app' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"office" text DEFAULT '' NOT NULL,
	"office_bn" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_single_row" CHECK ("platform_settings"."id" = 1)
);
--> statement-breakpoint
-- The single settings row, starting from what the website showed before
INSERT INTO "platform_settings" ("id", "office", "office_bn") VALUES (1, 'Mirpur, Dhaka 1216', 'মিরপুর, ঢাকা ১২১৬') ON CONFLICT DO NOTHING;
