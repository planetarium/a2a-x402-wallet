CREATE TABLE "a2a_device_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"user_code" text,
	"api_key" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "a2a_api_keys" (
	"api_key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
