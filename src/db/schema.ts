import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('STUDENT'),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const instituteSettings = pgTable('institute_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  instituteName: text('institute_name').notNull(),
  descriptor: text('descriptor').notNull(),
  tagline: text('tagline').notNull(),
  supportEmail: text('support_email').notNull(),
  whatsappNumbers: text('whatsapp_numbers').notNull(),
  address: text('address').notNull(),
  currency: text('currency').notNull().default('NGN'),
  bankName: text('bank_name').notNull(),
  accountName: text('account_name').notNull(),
  accountNumber: text('account_number').notNull(),
  paymentInstructions: text('payment_instructions').notNull(),
  instructorName: text('instructor_name').notNull(),
  instructorTitle: text('instructor_title').notNull(),
  instructorBio: text('instructor_bio').notNull(),
  instructorPortfolioUrl: text('instructor_portfolio_url').notNull(),
  instructorGithubUrl: text('instructor_github_url'),
  instructorLinkedinUrl: text('instructor_linkedin_url'),
  onboardingTemplate: jsonb('onboarding_template').$type<{
    scheduleNotes: string;
    softwareRequirements: string[];
    hardwareRequirements: string[];
    learningResources: string[];
    communicationChannels: string;
    assignmentExpectations: string;
    trainingPolicies: string;
  }>().notNull(),
  notificationTemplates: jsonb('notification_templates').$type<Record<string, { subject: string; body: string }>>().notNull(),
  reminderHoursBeforeDue: integer('reminder_hours_before_due').notNull().default(48),
  gracePeriodHours: integer('grace_period_hours').notNull().default(48),
  paymentPolicySummary: text('payment_policy_summary').notNull().default('Invoices are issued ahead of payment due dates. Automated payment reminders are dispatched 48 hours before each instalment deadline. A 48-hour grace period applies for communicated delays. Official receipts are issued strictly after verified reconciliation.'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const programmes = pgTable('programmes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  description: text('description').notNull(),
  learningObjectives: jsonb('learning_objectives').$type<string[]>().notNull(),
  skillsAcquired: jsonb('skills_acquired').$type<string[]>().notNull(),
  modules: jsonb('modules').$type<{ title: string; duration: string; topics: string[] }[]>().notNull(),
  weeklyDeliverables: jsonb('weekly_deliverables').$type<{
    weekNumber: number;
    title: string;
    sessionCommitment: string;
    learn: string[];
    practise: string[];
    produce: string;
  }[]>().notNull().default([]),
  graduationOutcomes: jsonb('graduation_outcomes').$type<string[]>().notNull().default([]),
  sessionSchedule: text('session_schedule').notNull().default('3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)'),
  durationText: text('duration_text').notNull(),
  durationWeeks: integer('duration_weeks').notNull().default(3),
  deliveryFormat: text('delivery_format').notNull(),
  weeklyFeeAmount: integer('weekly_fee_amount').notNull().default(430000),
  feeAmount: integer('fee_amount').notNull(),
  allowsInstalments: boolean('allows_instalments').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cohorts = pgTable('cohorts', {
  id: serial('id').primaryKey(),
  programmeId: integer('programme_id')
    .references(() => programmes.id)
    .notNull(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  instructorId: integer('instructor_id').references(() => users.id),
  instructorName: text('instructor_name').notNull(),
  deliveryFormat: text('delivery_format').notNull(),
  scheduleText: text('schedule_text').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  capacity: integer('capacity').notNull().default(30),
  status: text('status').notNull().default('UPCOMING'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  referenceNumber: text('reference_number').notNull().unique(),
  programmeId: integer('programme_id').references(() => programmes.id),
  programmeName: text('programme_name').notNull(),
  userId: integer('user_id').references(() => users.id),
  status: text('status').notNull().default('PENDING'),
  fullName: text('full_name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  nationality: text('nationality').notNull(),
  stateCity: text('state_city').notNull(),
  residentialAddress: text('residential_address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  gender: text('gender'),
  highestQualification: text('highest_qualification').notNull(),
  institutionAttended: text('institution_attended'),
  professionalStatus: text('professional_status').notNull(),
  occupationIndustry: text('occupation_industry'),
  previousExperience: jsonb('previous_experience').$type<string[]>().notNull(),
  availableDevices: jsonb('available_devices').$type<string[]>().notNull(),
  internetAccess: text('internet_access').notNull(),
  toolFamiliarity: jsonb('tool_familiarity').$type<Record<string, string>>().notNull(),
  preferredSetup: text('preferred_setup').notNull(),
  preferredFormat: text('preferred_format').notNull(),
  preferredPaymentPlan: text('preferred_payment_plan').notNull().default('FULL_PAYMENT'),
  learningObjectives: text('learning_objectives').notNull(),
  projectIdea: text('project_idea'),
  expectedOutcome: text('expected_outcome').notNull(),
  availability: text('availability').notNull(),
  canCompleteAssignments: text('can_complete_assignments').notNull(),
  emergencyContactName: text('emergency_contact_name').notNull(),
  emergencyContactPhone: text('emergency_contact_phone').notNull(),
  sponsorName: text('sponsor_name'),
  sponsorDetails: text('sponsor_details'),
  consentAccuracy: boolean('consent_accuracy').notNull().default(true),
  consentPrivacy: boolean('consent_privacy').notNull().default(true),
  consentMedia: boolean('consent_media').notNull().default(false),
  signatureName: text('signature_name').notNull(),
  guardianSignature: text('guardian_signature'),
  submittedDate: text('submitted_date').notNull(),
  internalNotes: text('internal_notes'),
  infoRequestMessage: text('info_request_message'),
  reviewedByUserId: integer('reviewed_by_user_id').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const studentProfiles = pgTable('student_profiles', {
  id: serial('id').primaryKey(),
  admissionNumber: text('admission_number').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  applicationId: integer('application_id').references(() => applications.id),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  location: text('location'),
  programmeId: integer('programme_id')
    .references(() => programmes.id)
    .notNull(),
  cohortId: integer('cohort_id').references(() => cohorts.id),
  commencementDate: text('commencement_date').notNull(),
  academicStatus: text('academic_status').notNull().default('ACTIVE'),
  preferredSetup: text('preferred_setup'),
  preferredPaymentPlan: text('preferred_payment_plan').notNull().default('FULL_PAYMENT'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const admissions = pgTable('admissions', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id')
    .references(() => applications.id)
    .notNull(),
  studentProfileId: integer('student_profile_id').references(() => studentProfiles.id),
  programmeId: integer('programme_id')
    .references(() => programmes.id)
    .notNull(),
  cohortId: integer('cohort_id').references(() => cohorts.id),
  offerStatus: text('offer_status').notNull().default('OFFERED'),
  admissionLetterIssuedAt: timestamp('admission_letter_issued_at'),
  onboardingSentAt: timestamp('onboarding_sent_at'),
  issuedByUserId: integer('issued_by_user_id').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const paymentPlans = pgTable('payment_plans', {
  id: serial('id').primaryKey(),
  planCode: text('plan_code').notNull().unique(),
  studentProfileId: integer('student_profile_id').references(() => studentProfiles.id),
  applicationId: integer('application_id').references(() => applications.id),
  recipientName: text('recipient_name').notNull(),
  recipientEmail: text('recipient_email').notNull(),
  recipientPhone: text('recipient_phone'),
  programmeId: integer('programme_id').references(() => programmes.id),
  programmeTitle: text('programme_title').notNull(),
  planType: text('plan_type').notNull().default('FULL_PAYMENT'),
  weeklyFeeAmount: integer('weekly_fee_amount').notNull().default(430000),
  totalWeeks: integer('total_weeks').notNull().default(3),
  totalFee: integer('total_fee').notNull(),
  discount: integer('discount').notNull().default(0),
  additionalCharges: integer('additional_charges').notNull().default(0),
  netTotalPayable: integer('net_total_payable').notNull(),
  commencementDate: text('commencement_date').notNull(),
  status: text('status').notNull().default('UNPAID'),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  paymentPlanId: integer('payment_plan_id').references(() => paymentPlans.id),
  studentProfileId: integer('student_profile_id').references(() => studentProfiles.id),
  applicationId: integer('application_id').references(() => applications.id),
  recipientName: text('recipient_name').notNull(),
  recipientEmail: text('recipient_email').notNull(),
  recipientPhone: text('recipient_phone'),
  programmeId: integer('programme_id').references(() => programmes.id),
  programmeTitle: text('programme_title').notNull(),
  trainingDuration: text('training_duration').notNull(),
  trainingFormat: text('training_format').notNull(),
  invoiceType: text('invoice_type').notNull().default('FULL'),
  instalmentNumber: integer('instalment_number').notNull().default(1),
  totalInstalments: integer('total_instalments').notNull().default(1),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  additionalCharges: integer('additional_charges').notNull().default(0),
  totalPayable: integer('total_payable').notNull(),
  amountPaid: integer('amount_paid').notNull().default(0),
  balanceDue: integer('balance_due').notNull(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  graceDeadline: text('grace_deadline'),
  reminderSentAt: timestamp('reminder_sent_at'),
  paymentArrangement: text('payment_arrangement').notNull().default('Full payment'),
  paymentInstructions: text('payment_instructions').notNull(),
  status: text('status').notNull().default('UNPAID'),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id')
    .references(() => invoices.id)
    .notNull(),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
  lineTotal: integer('line_total').notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id')
    .references(() => invoices.id)
    .notNull(),
  studentProfileId: integer('student_profile_id').references(() => studentProfiles.id),
  applicationId: integer('application_id').references(() => applications.id),
  amount: integer('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  transactionReference: text('transaction_reference').notNull().unique(),
  paystackReference: text('paystack_reference'),
  paymentDate: text('payment_date').notNull(),
  verificationStatus: text('verification_status').notNull().default('PENDING_VERIFICATION'),
  submittedByRole: text('submitted_by_role').notNull().default('ADMIN'),
  payerName: text('payer_name'),
  proofNotes: text('proof_notes'),
  verifiedByUserId: integer('verified_by_user_id').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const receipts = pgTable('receipts', {
  id: serial('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(),
  paymentId: integer('payment_id')
    .references(() => payments.id)
    .notNull()
    .unique(),
  invoiceId: integer('invoice_id')
    .references(() => invoices.id)
    .notNull(),
  studentProfileId: integer('student_profile_id').references(() => studentProfiles.id),
  studentName: text('student_name').notNull(),
  amountReceived: integer('amount_received').notNull(),
  paymentDate: text('payment_date').notNull(),
  paymentMethod: text('payment_method').notNull(),
  transactionReference: text('transaction_reference').notNull(),
  outstandingBalance: integer('outstanding_balance').notNull(),
  issuedByUserId: integer('issued_by_user_id').references(() => users.id),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
});

export const studentLedger = pgTable('student_ledger', {
  id: serial('id').primaryKey(),
  studentProfileId: integer('student_profile_id').references(() => studentProfiles.id),
  applicationId: integer('application_id').references(() => applications.id),
  entryType: text('entry_type').notNull(),
  referenceNumber: text('reference_number').notNull(),
  description: text('description').notNull(),
  debitAmount: integer('debit_amount').notNull().default(0),
  creditAmount: integer('credit_amount').notNull().default(0),
  runningBalance: integer('running_balance').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  studentProfileId: integer('student_profile_id')
    .references(() => studentProfiles.id)
    .notNull(),
  programmeId: integer('programme_id')
    .references(() => programmes.id)
    .notNull(),
  cohortId: integer('cohort_id').references(() => cohorts.id),
  sessionDate: text('session_date').notNull(),
  sessionTopic: text('session_topic'),
  status: text('status').notNull(),
  instructorNotes: text('instructor_notes'),
  recordedByUserId: integer('recorded_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  programmeId: integer('programme_id')
    .references(() => programmes.id)
    .notNull(),
  cohortId: integer('cohort_id').references(() => cohorts.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  submissionRequirements: text('submission_requirements').notNull(),
  resourceUrl: text('resource_url'),
  resourceLabel: text('resource_label'),
  deadline: text('deadline').notNull(),
  maxScore: integer('max_score').notNull().default(100),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  assignmentId: integer('assignment_id')
    .references(() => assignments.id)
    .notNull(),
  studentProfileId: integer('student_profile_id')
    .references(() => studentProfiles.id)
    .notNull(),
  submissionUrl: text('submission_url').notNull(),
  notes: text('notes'),
  status: text('status').notNull().default('SUBMITTED'),
  score: integer('score'),
  feedback: text('feedback'),
  gradedByUserId: integer('graded_by_user_id').references(() => users.id),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  gradedAt: timestamp('graded_at'),
});

export const assessments = pgTable('assessments', {
  id: serial('id').primaryKey(),
  studentProfileId: integer('student_profile_id')
    .references(() => studentProfiles.id)
    .notNull(),
  programmeId: integer('programme_id')
    .references(() => programmes.id)
    .notNull(),
  assessmentType: text('assessment_type').notNull(),
  title: text('title').notNull(),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull().default(100),
  evaluationNotes: text('evaluation_notes'),
  evaluatedByUserId: integer('evaluated_by_user_id').references(() => users.id),
  evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
});

export const certificates = pgTable('certificates', {
  id: serial('id').primaryKey(),
  certificateNumber: text('certificate_number').notNull().unique(),
  studentProfileId: integer('student_profile_id')
    .references(() => studentProfiles.id)
    .notNull(),
  programmeId: integer('programme_id')
    .references(() => programmes.id)
    .notNull(),
  studentFullName: text('student_full_name').notNull(),
  programmeTitle: text('programme_title').notNull(),
  completionDate: text('completion_date').notNull(),
  issuedDate: text('issued_date').notNull(),
  verificationCode: text('verification_code').notNull().unique(),
  status: text('status').notNull().default('VALID'),
  approvedByUserId: integer('approved_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  recipientUserId: integer('recipient_user_id').references(() => users.id),
  recipientEmail: text('recipient_email').notNull(),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  channel: text('channel').notNull().default('IN_APP'),
  deliveryStatus: text('delivery_status').notNull().default('LOGGED'),
  providerMessageId: text('provider_message_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id').references(() => users.id),
  actorEmail: text('actor_email').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const programmesRelations = relations(programmes, ({ many }) => ({
  cohorts: many(cohorts),
  applications: many(applications),
  students: many(studentProfiles),
}));

export const cohortsRelations = relations(cohorts, ({ one }) => ({
  programme: one(programmes, {
    fields: [cohorts.programmeId],
    references: [programmes.id],
  }),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  programme: one(programmes, {
    fields: [studentProfiles.programmeId],
    references: [programmes.id],
  }),
  cohort: one(cohorts, {
    fields: [studentProfiles.cohortId],
    references: [cohorts.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ many }) => ({
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));
