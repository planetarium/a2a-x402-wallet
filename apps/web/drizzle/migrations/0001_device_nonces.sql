CREATE TABLE "device_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"token" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
