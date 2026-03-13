CREATE TABLE "cli_device_codes" (
	"device_code" text PRIMARY KEY NOT NULL,
	"user_code" text NOT NULL UNIQUE,
	"token" text,
	"status" text NOT NULL DEFAULT 'pending',
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
