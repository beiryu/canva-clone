ALTER TABLE "generated_image" ALTER COLUMN "settings" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "generated_image" ALTER COLUMN "settings" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "json" SET DATA TYPE jsonb;