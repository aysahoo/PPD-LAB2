CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(32) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"capacity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code"),
	CONSTRAINT "courses_capacity_positive" CHECK (capacity > 0)
);
--> statement-breakpoint
CREATE TABLE "course_prerequisites" (
	"course_id" integer NOT NULL,
	"prerequisite_course_id" integer NOT NULL,
	CONSTRAINT "course_prerequisites_course_id_prerequisite_course_id_pk" PRIMARY KEY("course_id","prerequisite_course_id"),
	CONSTRAINT "course_prerequisites_distinct" CHECK (course_id != prerequisite_course_id)
);
--> statement-breakpoint
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_prerequisite_course_id_courses_id_fk" FOREIGN KEY ("prerequisite_course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
