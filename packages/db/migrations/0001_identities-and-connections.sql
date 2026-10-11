CREATE TABLE "connection" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"provider" text NOT NULL,
	"auth_kind" text NOT NULL,
	"status" text NOT NULL,
	"scopes" text,
	"refresh_token_enc" text,
	"api_key_enc" text,
	"access_token_expires_at" timestamp,
	"provider_account_id" text,
	"provider_account_email" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "identity_google_sub_unique" UNIQUE("google_sub")
);
--> statement-breakpoint
ALTER TABLE "connection" ADD CONSTRAINT "connection_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity" ADD CONSTRAINT "identity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connection_identity_id_idx" ON "connection" USING btree ("identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connection_identity_provider_uidx" ON "connection" USING btree ("identity_id","provider");--> statement-breakpoint
CREATE INDEX "identity_user_id_idx" ON "identity" USING btree ("user_id");