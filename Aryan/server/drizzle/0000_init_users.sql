CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100),
	"email" varchar(100) NOT NULL,
	"phone" varchar(20),
	"password_hash" text NOT NULL,
	"role" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK (role IN ('student', 'admin'))
);
