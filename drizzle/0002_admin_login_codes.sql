CREATE TABLE "admin_login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_login_codes_session_idx" ON "admin_login_codes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "admin_login_codes_user_created_idx" ON "admin_login_codes" USING btree ("user_id","created_at");