ALTER TABLE "platform_settings" ALTER COLUMN "sms_rate_poisha" SET DEFAULT 0;--> statement-breakpoint
-- No rate until the super admin enters the provider's real price
UPDATE "platform_settings" SET "sms_rate_poisha" = 0;
