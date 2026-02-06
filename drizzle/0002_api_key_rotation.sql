ALTER TABLE "api_keys" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "grace_period_ends_at" timestamp;
