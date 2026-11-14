export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMINISTRATOR'
  | 'INSTRUCTOR'
  | 'FINANCE_OFFICER'
  | 'STUDENT';

export interface AppUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
}

export interface ProgrammeModule {
  title: string;
  duration: string;
  topics: string[];
}

export interface WeeklyDeliverable {
  weekNumber: number;
  title: string;
  sessionCommitment: string;
  learn: string[];
  practise: string[];
  produce: string;
}

export type PaymentPlanChoice = 'FULL_PAYMENT' | 'WEEKLY_INSTALMENTS';

export interface Programme {
  id: number;
  code: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  learningObjectives: string[];
  skillsAcquired: string[];
  modules: ProgrammeModule[];
  weeklyDeliverables: WeeklyDeliverable[];
  graduationOutcomes: string[];
  sessionSchedule: string;
  durationText: string;
  durationWeeks: number;
  deliveryFormat: string;
  weeklyFeeAmount: number;
  feeAmount: number;
  allowsInstalments: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface Cohort {
  id: number;
  programmeId: number;
  code: string;
  name: string;
  instructorId: number | null;
  instructorName: string;
  deliveryFormat: string;
  scheduleText: string;
  startDate: string;
  endDate: string | null;
  capacity: number;
  status: string;
}

export interface InstituteSettings {
  instituteName: string;
  descriptor: string;
  tagline: string;
  supportEmail: string;
  whatsappNumbers: string;
  address: string;
  currency: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  paymentInstructions?: string;
  reminderHoursBeforeDue?: number;
  gracePeriodHours?: number;
  paymentPolicySummary?: string;
  instructorName: string;
  instructorTitle: string;
  instructorBio: string;
  instructorPortfolioUrl: string;
  instructorGithubUrl?: string | null;
  instructorLinkedinUrl?: string | null;
  onboardingTemplate?: {
    scheduleNotes: string;
    softwareRequirements: string[];
    hardwareRequirements: string[];
    learningResources: string[];
    communicationChannels: string;
    assignmentExpectations: string;
    trainingPolicies: string;
  };
  notificationTemplates?: Record<string, { subject: string; body: string }>;
}

export interface ApplicationRecord {
  id: number;
  referenceNumber: string;
  programmeId: number | null;
  programmeName: string;
  status:
    | 'PENDING'
    | 'UNDER_REVIEW'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'WAITLISTED'
    | 'ENROLLED';
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  stateCity: string;
  residentialAddress: string;
  phone: string;
  email: string;
  gender: string | null;
  highestQualification: string;
  institutionAttended: string | null;
  professionalStatus: string;
  occupationIndustry: string | null;
  previousExperience: string[];
  availableDevices: string[];
  internetAccess: string;
  toolFamiliarity: Record<string, string>;
  preferredSetup: string;
  preferredFormat: string;
  preferredPaymentPlan: PaymentPlanChoice;
  learningObjectives: string;
  projectIdea: string | null;
  expectedOutcome: string;
  availability: string;
  canCompleteAssignments: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  sponsorName: string | null;
  sponsorDetails: string | null;
  consentAccuracy: boolean;
  consentPrivacy: boolean;
  consentMedia: boolean;
  signatureName: string;
  guardianSignature: string | null;
  submittedDate: string;
  internalNotes: string | null;
  infoRequestMessage: string | null;
  createdAt: string;
}

export interface StudentProfile {
  id: number;
  admissionNumber: string;
  userId: number | null;
  applicationId: number | null;
  fullName: string;
  email: string;
  phone: string;
  location: string | null;
  programmeId: number;
  cohortId: number | null;
  commencementDate: string;
  academicStatus: string;
  preferredSetup: string | null;
  preferredPaymentPlan: PaymentPlanChoice;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PaymentPlan {
  id: number;
  planCode: string;
  studentProfileId: number | null;
  applicationId: number | null;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  programmeId: number | null;
  programmeTitle: string;
  planType: PaymentPlanChoice;
  weeklyFeeAmount: number;
  totalWeeks: number;
  totalFee: number;
  discount: number;
  additionalCharges: number;
  netTotalPayable: number;
  commencementDate: string;
  status: string;
  createdAt: string;
}

export type PolicyState =
  | 'PAID'
  | 'PART_PAID'
  | 'DUE_SOON'
  | 'GRACE_PERIOD'
  | 'OVERDUE'
  | 'PENDING';

export interface Invoice {
  id: number;
  invoiceNumber: string;
  paymentPlanId: number | null;
  studentProfileId: number | null;
  applicationId: number | null;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  programmeId: number | null;
  programmeTitle: string;
  trainingDuration: string;
  trainingFormat: string;
  invoiceType: 'FULL' | 'WEEKLY_INSTALMENT';
  instalmentNumber: number;
  totalInstalments: number;
  subtotal: number;
  discount: number;
  additionalCharges: number;
  totalPayable: number;
  amountPaid: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  graceDeadline: string | null;
  reminderSentAt: string | null;
  paymentArrangement: string;
  paymentInstructions: string;
  status: string;
  policyState?: PolicyState;
  items?: InvoiceItem[];
}

export interface StudentFinancialSummary {
  accountKey: string;
  studentProfileId: number | null;
  applicationId: number | null;
  admissionNumber: string | null;
  recipientName: string;
  recipientEmail: string;
  programmeTitle: string;
  planType: PaymentPlanChoice | 'CUSTOM';
  totalProgrammeFee: number;
  amountPaid: number;
  outstandingBalance: number;
  nextDueDate: string | null;
  nextDueInvoiceNumber: string | null;
  graceDeadline: string | null;
  overallStatus: PolicyState;
  invoiceCount: number;
  paidInvoiceCount: number;
}

export interface PaymentRecord {
  id: number;
  invoiceId: number;
  studentProfileId: number | null;
  applicationId: number | null;
  amount: number;
  paymentMethod: string;
  transactionReference: string;
  paymentDate: string;
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  submittedByRole?: string;
  payerName?: string | null;
  proofNotes?: string | null;
  notes: string | null;
}

export interface ReceiptRecord {
  id: number;
  receiptNumber: string;
  paymentId: number;
  invoiceId: number;
  studentProfileId: number | null;
  studentName: string;
  amountReceived: number;
  paymentDate: string;
  paymentMethod: string;
  transactionReference: string;
  outstandingBalance: number;
  issuedAt: string;
}

export interface LedgerEntry {
  id: number;
  studentProfileId: number | null;
  applicationId: number | null;
  entryType: string;
  referenceNumber: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: number;
  studentProfileId: number;
  programmeId: number;
  cohortId: number | null;
  sessionDate: string;
  sessionTopic: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  instructorNotes: string | null;
}

export interface AssignmentRecord {
  id: number;
  programmeId: number;
  cohortId: number | null;
  title: string;
  description: string;
  submissionRequirements: string;
  resourceUrl: string | null;
  resourceLabel: string | null;
  deadline: string;
  maxScore: number;
}

export interface SubmissionRecord {
  id: number;
  assignmentId: number;
  studentProfileId: number;
  submissionUrl: string;
  notes: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export interface AssessmentRecord {
  id: number;
  studentProfileId: number;
  programmeId: number;
  assessmentType: string;
  title: string;
  score: number;
  maxScore: number;
  evaluationNotes: string | null;
  evaluatedAt: string;
}

export interface CertificateRecord {
  id: number;
  certificateNumber: string;
  studentProfileId: number;
  programmeId: number;
  studentFullName: string;
  programmeTitle: string;
  completionDate: string;
  issuedDate: string;
  verificationCode: string;
  status: 'VALID' | 'REVOKED';
}

export interface NotificationRecord {
  id: number;
  recipientUserId: number | null;
  recipientEmail: string;
  eventType: string;
  title: string;
  message: string;
  channel: string;
  deliveryStatus: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogRecord {
  id: number;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}
