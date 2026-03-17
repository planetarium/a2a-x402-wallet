CREATE TABLE "x402_accepts_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"accepts" json NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "x402_accepts_configs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "x402_pending_tasks" (
	"task_id" text PRIMARY KEY NOT NULL,
	"payment_requirements" json NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
