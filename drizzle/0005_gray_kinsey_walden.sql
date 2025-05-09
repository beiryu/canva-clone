ALTER TABLE "uploaded_image" ADD COLUMN "fullPath" text NOT NULL;--> statement-breakpoint
ALTER TABLE "uploaded_image" DROP COLUMN IF EXISTS "url";--> statement-breakpoint
ALTER TABLE "uploaded_image" DROP COLUMN IF EXISTS "width";--> statement-breakpoint
ALTER TABLE "uploaded_image" DROP COLUMN IF EXISTS "height";