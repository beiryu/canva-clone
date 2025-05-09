ALTER TABLE "generated_image" ADD COLUMN "userId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_image" ADD COLUMN "fullPath" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_image" ADD CONSTRAINT "generated_image_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "generated_image" DROP COLUMN IF EXISTS "url";