CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"actor_email" text NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"certificate_number" text NOT NULL,
	"student_profile_id" integer NOT NULL,
	"programme_id" integer NOT NULL,
	"student_full_name" text NOT NULL,
	"programme_title" text NOT NULL,
	"completion_date" text NOT NULL,
	"issued_date" text NOT NULL,
	"verification_code" text NOT NULL,
	"status" text DEFAULT 'VALID' NOT NULL,
	"approved_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_certificate_number_unique" UNIQUE("certificate_number"),
	CONSTRAINT "certificates_verification_code_unique" UNIQUE("verification_code")
);
CREATE TABLE "cohorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"programme_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"instructor_id" integer,
	"instructor_name" text NOT NULL,
	"delivery_format" text NOT NULL,
	"schedule_text" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"capacity" integer DEFAULT 30 NOT NULL,
	"status" text DEFAULT 'UPCOMING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cohorts_code_unique" UNIQUE("code")
);
CREATE TABLE "institute_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"institute_name" text NOT NULL,
	"descriptor" text NOT NULL,
	"tagline" text NOT NULL,
	"support_email" text NOT NULL,
	"whatsapp_numbers" text NOT NULL,
	"address" text NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"bank_name" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"payment_instructions" text NOT NULL,
	"instructor_name" text NOT NULL,
	"instructor_title" text NOT NULL,
	"instructor_bio" text NOT NULL,
	"instructor_portfolio_url" text NOT NULL,
	"instructor_github_url" text,
	"instructor_linkedin_url" text,
	"onboarding_template" jsonb NOT NULL,
	"notification_templates" jsonb NOT NULL,
	"reminder_hours_before_due" integer DEFAULT 48 NOT NULL,
	"grace_period_hours" integer DEFAULT 48 NOT NULL,
	"payment_policy_summary" text DEFAULT 'Invoices are issued ahead of payment due dates. Automated payment reminders are dispatched 48 hours before each instalment deadline. A 48-hour grace period applies for communicated delays. Official receipts are issued strictly after verified reconciliation.' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "institute_settings_key_unique" UNIQUE("key")
);
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"line_total" integer NOT NULL
);
