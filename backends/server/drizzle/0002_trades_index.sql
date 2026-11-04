DROP INDEX "trades_user_time_idx";--> statement-breakpoint
CREATE INDEX "trades_user_id_idx" ON "trades" USING btree ("user_id","id");