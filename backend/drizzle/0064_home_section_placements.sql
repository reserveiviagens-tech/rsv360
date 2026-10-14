CREATE TABLE IF NOT EXISTS "home_section_placements" (
  "id" serial PRIMARY KEY NOT NULL,
  "section" varchar(32) NOT NULL,
  "entity_type" varchar(32) NOT NULL,
  "entity_id" varchar(128) NOT NULL,
  "title_override" varchar(255),
  "cta_href" varchar(512),
  "order_index" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "home_section_placements_section_entity_unique"
  ON "home_section_placements" ("section", "entity_type", "entity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_section_placements_section_active_idx"
  ON "home_section_placements" ("section", "is_active", "order_index");
