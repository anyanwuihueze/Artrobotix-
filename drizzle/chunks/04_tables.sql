CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_number" text NOT NULL,
	"payment_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"student_profile_id" integer,
	"student_name" text NOT NULL,
	"amount_received" integer NOT NULL,
	"payment_date" text NOT NULL,
	"payment_method" text NOT NULL,
	"transaction_reference" text NOT NULL,
	"outstanding_balance" integer NOT NULL,
	"issued_by_user_id" integer,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_receipt_number_unique" UNIQUE("receipt_number"),
	CONSTRAINT "receipts_payment_id_unique" UNIQUE("payment_id")
);
CREATE TABLE "student_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_profile_id" integer,
	"application_id" integer,
	"entry_type" text NOT NULL,
	"reference_number" text NOT NULL,
	"description" text NOT NULL,
	"debit_amount" integer DEFAULT 0 NOT NULL,
	"credit_amount" integer DEFAULT 0 NOT NULL,
	"running_balance" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "student_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"admission_number" text NOT NULL,
	"user_id" integer,
	"application_id" integer,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"location" text,
	"programme_id" integer NOT NULL,
	"cohort_id" integer,
	"commencement_date" text NOT NULL,
	"academic_status" text DEFAULT 'ACTIVE' NOT NULL,
	"preferred_setup" text,
	"preferred_payment_plan" text DEFAULT 'FULL_PAYMENT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_admission_number_unique" UNIQUE("admission_number")
);
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"student_profile_id" integer NOT NULL,
	"submission_url" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"score" integer,
	"feedback" text,
	"graded_by_user_id" integer,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"graded_at" timestamp
);
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text DEFAULT 'STUDENT' NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
