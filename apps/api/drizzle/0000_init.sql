CREATE TYPE "public"."hierarchy_event_type" AS ENUM('picker_open', 'picker_close', 'node_expand', 'node_collapse', 'search_input', 'search_select', 'leaf_select', 'clear', 'close_blocked', 'chat_close');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('manager', 'operator');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('pending', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."test_group" AS ENUM('manual', 'search');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"display_name" text NOT NULL,
	"test_group" "test_group",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_login_unique" UNIQUE("login")
);
--> statement-breakpoint
CREATE TABLE "chat_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"scenario_id" text NOT NULL,
	"position" integer NOT NULL,
	"status" "run_status" DEFAULT 'pending' NOT NULL,
	"opened_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"final_leaf_id" text,
	"final_path" jsonb,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hierarchy_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "hierarchy_event_type" NOT NULL,
	"node_id" text,
	"query" text,
	"results_count" integer,
	"result_index" integer,
	"path" jsonb
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_runs" ADD CONSTRAINT "chat_runs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hierarchy_events" ADD CONSTRAINT "hierarchy_events_run_id_chat_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."chat_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_runs_account_idx" ON "chat_runs" USING btree ("account_id","archived","position");--> statement-breakpoint
CREATE INDEX "hierarchy_events_run_idx" ON "hierarchy_events" USING btree ("run_id","ts");--> statement-breakpoint
CREATE INDEX "sessions_account_idx" ON "sessions" USING btree ("account_id");