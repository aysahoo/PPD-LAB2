CREATE TABLE "revoked_tokens" (
	"jti" varchar(36) PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "credits" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_credits_positive" CHECK (credits > 0);