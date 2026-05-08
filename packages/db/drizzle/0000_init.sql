CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."host_type" AS ENUM('A', 'AAAA');--> statement-breakpoint
CREATE TYPE "public"."update_result" AS ENUM('good', 'nochg', 'nohost', 'badauth', 'badagent', 'abuse', '!donator', '911');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hostname" varchar(253) NOT NULL,
	"type" "host_type" DEFAULT 'A' NOT NULL,
	"current_ip" "inet",
	"ttl" integer DEFAULT 60 NOT NULL,
	"cloudflare_record_id" varchar(64),
	"last_update" timestamp with time zone,
	"update_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "update_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid,
	"requested_hostname" varchar(253) NOT NULL,
	"ip" "inet",
	"source_ip" "inet",
	"user_agent" varchar(255),
	"result" "update_result" NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(64) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"token_prefix" varchar(12) NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ip_bans" (
	"ip" "inet" PRIMARY KEY NOT NULL,
	"reason" varchar(128) NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	"banned_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hosts" ADD CONSTRAINT "hosts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_logs" ADD CONSTRAINT "update_logs_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "hosts_hostname_idx" ON "hosts" USING btree ("hostname");--> statement-breakpoint
CREATE INDEX "hosts_user_idx" ON "hosts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "update_logs_host_ts_idx" ON "update_logs" USING btree ("host_id","ts");--> statement-breakpoint
CREATE INDEX "update_logs_ts_idx" ON "update_logs" USING btree ("ts");--> statement-breakpoint
CREATE UNIQUE INDEX "api_tokens_hash_idx" ON "api_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "api_tokens_user_idx" ON "api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ip_bans_banned_until_idx" ON "ip_bans" USING btree ("banned_until");