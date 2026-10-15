CREATE TYPE "public"."study_group" AS ENUM('science', 'commerce', 'humanities');--> statement-breakpoint
DROP INDEX "subjects_class_name_idx";--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "study_group" "study_group";--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "study_group" "study_group";--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_class_name_common_idx" ON "subjects" USING btree ("class_id","name") WHERE "subjects"."study_group" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_class_name_group_idx" ON "subjects" USING btree ("class_id","name","study_group") WHERE "subjects"."study_group" is not null;