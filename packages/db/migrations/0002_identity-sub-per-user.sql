ALTER TABLE "identity" DROP CONSTRAINT "identity_google_sub_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "identity_user_google_sub_uidx" ON "identity" USING btree ("user_id","google_sub");