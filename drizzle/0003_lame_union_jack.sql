ALTER TABLE "generated_image" ALTER COLUMN "settings" SET DATA TYPE jsonb USING 
  CASE 
    WHEN settings IS NULL THEN NULL
    WHEN settings = '' THEN '{}'::jsonb
    ELSE COALESCE(settings::jsonb, '{}'::jsonb) 
  END;
--> statement-breakpoint
ALTER TABLE "generated_image" ALTER COLUMN "settings" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "json" SET DATA TYPE jsonb USING 
  CASE 
    WHEN json = '' THEN '{}'::jsonb
    ELSE json::jsonb
  END;