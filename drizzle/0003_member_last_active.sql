ALTER TABLE "institute_members" ADD COLUMN "last_active_at" timestamp with time zone;--> statement-breakpoint
-- Backfill from existing Neon Auth sessions (one time)
UPDATE "institute_members" m SET "last_active_at" = s.latest
FROM (SELECT "userId"::text AS user_id, max("updatedAt") AS latest FROM neon_auth.session GROUP BY 1) s
WHERE s.user_id = m.user_id;--> statement-breakpoint
UPDATE "institutes" i SET "last_active_at" = m.latest
FROM (SELECT institute_id, max(last_active_at) AS latest FROM "institute_members" GROUP BY 1) m
WHERE m.institute_id = i.id AND m.latest IS NOT NULL AND (i.last_active_at IS NULL OR i.last_active_at < m.latest);
