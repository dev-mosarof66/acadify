-- Plans become an editable catalog: keys are plain text (no fixed enum), with prices, features and website settings.
ALTER TABLE "institutes" DROP CONSTRAINT "institutes_plan_plans_key_fk";--> statement-breakpoint
ALTER TABLE "institutes" ALTER COLUMN "plan" SET DATA TYPE text USING "plan"::text;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "key" SET DATA TYPE text USING "key"::text;--> statement-breakpoint
ALTER TABLE "institutes" ADD CONSTRAINT "institutes_plan_plans_key_fk" FOREIGN KEY ("plan") REFERENCES "public"."plans"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."plan_key";--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "name_bn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "tagline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "tagline_bn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "yearly_price_bdt" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "features" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "features_bn" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Move the wording that used to live in the website's translation files into the plans themselves.
-- Yearly price keeps the website's previous offer: 10 months' price for 12 months ("2 months free").
UPDATE "plans" SET "name_bn" = 'ফ্রি ট্রায়াল', "tagline" = '30 days, every feature', "tagline_bn" = '৩০ দিন, সব ফিচার', "is_public" = false WHERE "key" = 'trial';--> statement-breakpoint
UPDATE "plans" SET "name_bn" = 'স্টার্টার', "tagline" = 'Up to 300 students', "tagline_bn" = '৩০০ শিক্ষার্থী পর্যন্ত', "yearly_price_bdt" = "price_bdt" * 10,
  "features" = ARRAY['Attendance and absence SMS', 'Monthly fee slips and receipts', 'Results and mark sheets', 'Email support'],
  "features_bn" = ARRAY['হাজিরা ও অনুপস্থিতির এসএমএস', 'মাসিক ফি স্লিপ ও রসিদ', 'ফলাফল ও মার্কশিট', 'ইমেইল সাপোর্ট']
  WHERE "key" = 'starter';--> statement-breakpoint
UPDATE "plans" SET "name_bn" = 'ইনস্টিটিউট', "tagline" = 'Up to 1,500 students', "tagline_bn" = '১,৫০০ শিক্ষার্থী পর্যন্ত', "yearly_price_bdt" = "price_bdt" * 10, "featured" = true,
  "features" = ARRAY['Everything in Starter', 'Hifz tracker and boarding', 'bKash and Nagad collection', 'Guardian and student portal'],
  "features_bn" = ARRAY['স্টার্টারের সবকিছু', 'হিফজ ট্র্যাকার ও বোর্ডিং', 'বিকাশ ও নগদে ফি আদায়', 'অভিভাবক ও শিক্ষার্থী পোর্টাল']
  WHERE "key" = 'institute';--> statement-breakpoint
UPDATE "plans" SET "name_bn" = 'ক্যাম্পাস', "tagline" = 'Several branches or streams', "tagline_bn" = 'একাধিক শাখা বা ধারা',
  "features" = ARRAY['Everything in Institute', 'Branch-wise accounts', 'Your own domain', 'On-site staff training'],
  "features_bn" = ARRAY['ইনস্টিটিউটের সবকিছু', 'শাখাভিত্তিক হিসাব', 'নিজস্ব ডোমেইন', 'সরেজমিনে স্টাফ প্রশিক্ষণ']
  WHERE "key" = 'campus';
