CREATE TABLE IF NOT EXISTS "generated_image" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"url" text NOT NULL,
	"prompt" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_image" ADD CONSTRAINT "generated_image_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
