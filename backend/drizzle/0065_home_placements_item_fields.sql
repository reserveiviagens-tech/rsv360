ALTER TABLE "home_section_placements"
  ADD COLUMN IF NOT EXISTS "subtitle_override" varchar(512),
  ADD COLUMN IF NOT EXISTS "badge_text" varchar(64),
  ADD COLUMN IF NOT EXISTS "image_url" varchar(1024);
