import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  LogOut,
  Menu,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  ApplicationRecord,
  AssessmentRecord,
  AssignmentRecord,
  AttendanceRecord,
  CertificateRecord,
  Cohort,
  InstituteSettings,
  Invoice,
  LedgerEntry,
  NotificationRecord,
  PaymentPlan,
  PaymentRecord,
  PolicyState,
  Programme,
  ReceiptRecord,
  StudentProfile,
  SubmissionRecord,
} from '../types';
import {
  downloadAdmissionLetterPdf,
  downloadCertificatePdf,
  downloadOfficialReceiptPdf,
  downloadProformaInvoicePdf,
} from '../lib/pdfGenerator';
import BrandEmblem from './BrandEmblem';

type StudentTab =
  | 'dashboard'
  | 'profile'
  | 'programme'
  | 'assignments'
  | 'attendance'
  | 'finance'
  | 'certificates'
  | 'notifications';

interface StudentDashboardData {
  profile: StudentProfile | null;
  programme: Programme | null;
  cohort: Cohort | null;
  applications: ApplicationRecord[];
  onboardingTemplate: InstituteSettings['onboardingTemplate'] | null;
  instituteContact: InstituteSettings | null;
  paystackConfigured: boolean;
  attendance: AttendanceRecord[];
  attendanceRate: number;
  assignments: AssignmentRecord[];
  submissions: SubmissionRecord[];
  assessments: AssessmentRecord[];
  paymentPlans: PaymentPlan[];
  invoices: Invoice[];
  financialSummary: {
    totalProgrammeFee: number;
    amountPaid: number;
    outstandingBalance: number;
    nextDueDate: string | null;
    nextDueInvoiceNumber: string | null;
    graceDeadline: string | null;
    overallStatus: PolicyState;
    planType: string;
  };
  payments: PaymentRecord[];
  receipts: ReceiptRecord[];
  ledger: LedgerEntry[];
  certificates: CertificateRecord[];
  notifications: NotificationRecord[];
}

function formatPolicyLabel(state?: PolicyState | string): {
  text: string;
  className: string;
} {
  switch (state) {
    case 'PAID':
      return { text: 'PAID', className: 'text-emerald-700' };
    case 'PART_PAID':
      return { text: 'PARTIALLY PAID', className: 'text-amber-700' };
    case 'DUE_SOON':
      return { text: 'DUE SOON', className: 'text-[#F9501E]' };
    case 'GRACE_PERIOD':
      return { text: 'GRACE PERIOD', className: 'text-amber-800' };
    case 'OVERDUE':
      return { text: 'OVERDUE', className: 'text-red-700' };
    default:
      return { text: 'PENDING', className: 'text-neutral-700' };
  }
}

export default function StudentPortal({
  onBackToPublic,
}: {
  onBackToPublic: () => void;
}) {
  const { dbUser, logout, apiFetch } = useAuth();
  const [tab, setTab] = useState<StudentTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [phoneInput, setPhoneInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [setupInput, setSetupInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  // Assignment submission state
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | null>(
    null
  );
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submittingWork, setSubmittingWork] = useState(false);

  // Student Finance actions (Transfer Proof & Paystack)
  const [proofInvoiceId, setProofInvoiceId] = useState<number | null>(null);
  const [proofAmount, setProofAmount] = useState('');
  const [proofPayerName, setProofPayerName] = useState('');
  const [proofRef, setProofRef] = useState('');
  const [proofDate, setProofDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [proofNotes, setProofNotes] = useState('');
  const [financeBusy, setFinanceBusy] = useState(false);
  const [financeNotice, setFinanceNotice] = useState<string | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<StudentDashboardData>('/api/student/dashboard');
      setData(res);
      if (res.profile) {
        setPhoneInput(res.profile.phone || '');
        setLocationInput(res.profile.location || '');
        setSetupInput(res.profile.preferredSetup || 'Laptop-based development');
        setProofPayerName((prev) => prev || res.profile?.fullName || '');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load student portal.'
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      await apiFetch('/api/student/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          phone: phoneInput,
          location: locationInput,
          preferredSetup: setupInput,
        }),
      });
      setProfileNotice('Contact and setup preferences updated.');
      await loadData();
    } catch (err) {
      setProfileNotice(
        err instanceof Error ? err.message : 'Failed to update profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignmentId) return;
    setSubmittingWork(true);
    try {
      await apiFetch(`/api/student/assignments/${activeAssignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          submissionUrl,
          notes: submissionNotes,
        }),
      });
      setActiveAssignmentId(null);
      setSubmissionUrl('');
      setSubmissionNotes('');
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit assignment.'
      );
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleSubmitTransferProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofInvoiceId) return;
    setFinanceBusy(true);
    setFinanceError(null);
    setFinanceNotice(null);
    try {
      await apiFetch(`/api/student/invoices/${proofInvoiceId}/transfer-proof`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(proofAmount),
          payerName: proofPayerName,
          transactionReference: proofRef,
          paymentDate: proofDate,
          proofNotes,
        }),
      });
      setFinanceNotice(
        'Bank transfer proof submitted as PENDING_VERIFICATION. Your Official Receipt will be issued once our Finance Office reconciles the transfer.'
      );
      setProofInvoiceId(null);
      setProofRef('');
      setProofNotes('');
      await loadData();
    } catch (err) {
      setFinanceError(
        err instanceof Error
          ? err.message
          : 'Unable to submit transfer proof.'
      );
    } finally {
      setFinanceBusy(false);
    }
  };

  const handleStartPaystack = async (inv: Invoice) => {
    setFinanceBusy(true);
    setFinanceError(null);
    setFinanceNotice(null);
    try {
      const res = await apiFetch<{
        authorizationUrl: string;
        reference: string;
      }>(`/api/student/invoices/${inv.id}/paystack`, {
        method: 'POST',
        body: JSON.stringify({ amount: inv.balanceDue }),
      });
      setFinanceNotice(
        `Paystack checkout initialized (${res.reference}). Completing in Paystack checkout.`
      );
      window.location.href = res.authorizationUrl;
    } catch (err) {
      setFinanceError(
        err instanceof Error
          ? err.message
          : 'Paystack checkout unavailable — please use Bank Transfer Proof submission below.'
      );
    } finally {
      setFinanceBusy(false);
    }
  };

  const markRead = async (id: number) => {
    try {
      await apiFetch(`/api/student/notifications/${id}/read`, {
        method: 'PATCH',
      });
      await loadData();
    } catch {
      // ignore transient error
    }
  };

  const navItems: { id: StudentTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'My Dashboard', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { id: 'programme', label: 'Programme & Onboarding', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'assignments', label: 'Assignments & Grades', icon: <FileText className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance & Progress', icon: <Calendar className="w-4 h-4" /> },
    { id: 'finance', label: 'Invoices & Receipts', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'certificates', label: 'My Certificates', icon: <Award className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  ];

  const currency = data?.instituteContact?.currency || 'NGN';
  const unreadCount =
    data?.notifications.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#111111] flex flex-col lg:flex-row">
      {/* Sidebar (Desktop) & Top Bar (Mobile) */}
      <aside className="lg:w-64 lg:shrink-0 bg-[#111111] text-white flex flex-col">
        <div className="h-20 px-5 flex items-center justify-between border-b border-neutral-800">
          <button
            type="button"
            onClick={onBackToPublic}
            className="group flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F9501E]/60 rounded-sm"
          >
            <BrandEmblem size="sm" tone="dark" alt="Artdrobotix" />
            <span className="font-display font-bold text-sm tracking-tight whitespace-nowrap group-hover:text-white transition-colors">
              STUDENT PORTAL
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden p-2 text-neutral-300 hover:text-white"
            aria-label="Toggle student menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav
          className={`${
            mobileNavOpen ? 'block' : 'hidden'
          } lg:block flex-1 p-3 space-y-1`}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setMobileNavOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-[#F9501E] text-white'
                  : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 whitespace-nowrap">
                {item.icon}
                {item.label}
              </span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="font-mono text-xs tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="hidden lg:block p-4 border-t border-neutral-800 space-y-3 text-xs">
          <div>
            <div className="font-semibold text-white truncate">
              {data?.profile?.fullName || dbUser?.fullName}
            </div>
            <div className="text-neutral-400 font-mono mt-0.5 truncate">
              {data?.profile?.admissionNumber || dbUser?.email}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onBackToPublic}
              className="text-left text-neutral-300 hover:text-white py-1"
            >
              Public Website
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-[#F9501E] py-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
        {loading ? (
          <div className="bg-white border border-neutral-200 p-8 text-sm text-neutral-600">
            Loading your student records...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 p-6 text-sm text-red-800">
            {error}
          </div>
        ) : !data ? null : (
          <>
            {/* Top Mobile Action Strip */}
            <div className="lg:hidden flex items-center justify-between mb-4 pb-3 border-b border-neutral-200 text-xs">
              <span className="font-mono font-semibold text-[#F9501E]">
                {data.profile?.admissionNumber || dbUser?.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1 text-neutral-600"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>

            {tab === 'dashboard' && (
              <div className="space-y-6">
                <div className="bg-white border border-neutral-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#F9501E]">
                        {data.profile
                          ? `ADMISSION NO: ${data.profile.admissionNumber}`
                          : 'APPLICANT & STUDENT WORKSPACE'}
                      </p>
                      <h1 className="text-2xl font-bold text-[#111111] mt-1">
                        Welcome, {data.profile?.fullName || dbUser?.fullName}
                      </h1>
                      <p className="text-sm text-neutral-600 mt-1">
                        {data.programme
                          ? `${data.programme.title} · ${
                              data.cohort?.name || 'Cohort Pending'
                            }`
                          : data.applications[0]
                            ? `Application ${data.applications[0].referenceNumber} — Status: ${data.applications[0].status}`
                            : 'No active programme enrolment linked to this email yet.'}
                      </p>
                    </div>
                    {data.profile && data.programme && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadAdmissionLetterPdf(
                            data.profile!,
                            data.programme,
                            data.cohort,
                            data.instituteContact
                          )
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white text-xs font-medium hover:bg-neutral-800 shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Admission Letter PDF
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-neutral-200 p-5">
                    <div className="text-xs text-neutral-500">Attendance Rate</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-[#111111] mt-1">
                      {data.attendanceRate}%
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 p-5">
                    <div className="text-xs text-neutral-500">
                      Assignments Submitted
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-[#111111] mt-1">
                      {data.submissions.length} / {data.assignments.length}
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 p-5">
                    <div className="text-xs text-neutral-500">
                      Outstanding Balance
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-[#F9501E] mt-1">
                      {currency}{' '}
                      {(
                        data.financialSummary?.outstandingBalance ??
                        data.invoices
                          .filter((i) => i.status !== 'CANCELLED')
                          .reduce((s, i) => s + i.balanceDue, 0)
                      ).toLocaleString()}
                    </div>
                    {data.financialSummary?.nextDueDate && (
                      <div className="text-[11px] font-mono text-neutral-500 mt-1 tabular-nums">
                        Next due: {data.financialSummary.nextDueDate}
                      </div>
                    )}
                  </div>
                  <div className="bg-white border border-neutral-200 p-5">
                    <div className="text-xs text-neutral-500">
                      Payment Plan / Certificates
                    </div>
                    <div className="text-sm font-bold font-mono text-[#111111] mt-1.5">
                      {data.financialSummary?.planType === 'WEEKLY_INSTALMENTS'
                        ? 'WEEKLY INSTALMENTS'
                        : 'FULL PAYMENT'}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                      {data.certificates.length} certificate(s) issued
                    </div>
                  </div>
                </div>

                {/* Applications if awaiting enrolment */}
                {data.applications.length > 0 && (
                  <div className="bg-white border border-neutral-200 p-6">
                    <h2 className="text-base font-bold text-[#111111] mb-4">
                      My Applications
                    </h2>
                    <div className="divide-y divide-neutral-200 text-sm">
                      {data.applications.map((app) => (
                        <div
                          key={app.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono font-semibold text-[#F9501E]">
                              {app.referenceNumber}
                            </span>{' '}
                            · <span className="font-medium">{app.programmeName}</span>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              Submitted {app.submittedDate} · Format:{' '}
                              {app.preferredFormat} · Plan:{' '}
                              {app.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
                                ? 'Weekly Instalments'
                                : 'Full Payment'}
                            </div>
                          </div>
                          <span className="font-mono text-xs font-semibold text-[#111111]">
                            {app.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'profile' && (
              <div className="bg-white border border-neutral-200 p-6 max-w-2xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#111111]">My Profile</h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Admission numbers, academic status, and programme records are
                    managed exclusively by Artdrobotix Administration.
                  </p>
                </div>

                {data.profile ? (
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-[#F9F8F6] p-4 border border-neutral-200">
                      <div>
                        <div className="text-xs text-neutral-500">
                          Admission Number
                        </div>
                        <div className="font-mono font-bold mt-0.5">
                          {data.profile.admissionNumber}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500">
                          Academic Status
                        </div>
                        <div className="font-semibold mt-0.5">
                          {data.profile.academicStatus}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500">Full Name</div>
                        <div className="font-medium mt-0.5">
                          {data.profile.fullName}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500">
                          Registered Email
                        </div>
                        <div className="font-medium mt-0.5">
                          {data.profile.email}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Location (City / State)
                      </label>
                      <input
                        type="text"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Preferred Development Setup
                      </label>
                      <select
                        value={setupInput}
                        onChange={(e) => setSetupInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm bg-white"
                      >
                        <option value="Laptop-based development">
                          Laptop-based development
                        </option>
                        <option value="Smartphone-based development">
                          Smartphone-based development
                        </option>
                        <option value="Both laptop and smartphone">
                          Both laptop and smartphone
                        </option>
                      </select>
                    </div>

                    {profileNotice && (
                      <p className="text-xs font-medium text-[#F9501E]">
                        {profileNotice}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-5 py-2.5 bg-[#111111] text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
                    >
                      {savingProfile ? 'Saving...' : 'Update Contact Details'}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-neutral-600">
                    Your enrolled student profile will appear here once admissions
                    completes your enrolment.
                  </p>
                )}
              </div>
            )}

            {tab === 'programme' && (
              <div className="space-y-6">
                {data.programme ? (
                  <>
                    <div className="bg-white border border-neutral-200 p-6">
                      <div className="text-xs font-mono text-[#F9501E]">
                        {data.programme.code}
                      </div>
                      <h2 className="text-xl font-bold text-[#111111] mt-1">
                        {data.programme.title}
                      </h2>
                      <p className="text-sm text-neutral-600 mt-2">
                        {data.programme.description}
                      </p>
                      {data.cohort && (
                        <div className="mt-4 pt-4 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-neutral-500">Cohort</div>
                            <div className="font-semibold">
                              {data.cohort.name} ({data.cohort.code})
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-neutral-500">Schedule</div>
                            <div className="font-medium">
                              {data.cohort.scheduleText}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-neutral-500">
                              Instructor
                            </div>
                            <div className="font-medium">
                              {data.cohort.instructorName}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {Array.isArray(data.programme.weeklyDeliverables) &&
                    data.programme.weeklyDeliverables.length > 0 ? (
                      <div className="bg-white border border-neutral-200 p-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                          <h3 className="text-base font-bold">
                            Weekly Deliverables &amp; Practice Roadmap
                          </h3>
                          <span className="font-mono text-xs text-neutral-500">
                            {data.programme.sessionSchedule || data.programme.durationText}
                          </span>
                        </div>
                        <div className="space-y-4">
                          {data.programme.weeklyDeliverables.map((wk) => (
                            <div
                              key={wk.weekNumber}
                              className="border border-neutral-200 p-4 bg-[#F9F8F6] space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className="font-bold text-sm text-[#111111]">
                                  Week {wk.weekNumber}: {wk.title}
                                </span>
                                <span className="font-mono text-xs text-[#F9501E]">
                                  {wk.sessionCommitment}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                  <div className="font-semibold text-neutral-500 mb-1">
                                    What You Learn
                                  </div>
                                  <ul className="space-y-1 text-neutral-700">
                                    {wk.learn.map((item, idx) => (
                                      <li key={idx}>· {item}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="font-semibold text-neutral-500 mb-1">
                                    What You Practise
                                  </div>
                                  <ul className="space-y-1 text-neutral-700">
                                    {wk.practise.map((item, idx) => (
                                      <li key={idx}>· {item}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="font-semibold text-neutral-500 mb-1">
                                    Weekly Deliverable Produced
                                  </div>
                                  <p className="text-neutral-900 font-medium leading-relaxed">
                                    {wk.produce}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {Array.isArray(data.programme.graduationOutcomes) &&
                          data.programme.graduationOutcomes.length > 0 && (
                            <div className="border-t border-neutral-200 pt-4">
                              <h4 className="text-xs font-semibold text-neutral-500 mb-2">
                                Graduation Outcomes
                              </h4>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-800">
                                {data.programme.graduationOutcomes.map((out, i) => (
                                  <li key={i}>· {out}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="bg-white border border-neutral-200 p-6">
                        <h3 className="text-base font-bold mb-4">
                          Curriculum Modules
                        </h3>
                        <div className="space-y-4">
                          {data.programme.modules.map((mod, idx) => (
                            <div
                              key={idx}
                              className="border border-neutral-200 p-4 bg-[#F9F8F6]"
                            >
                              <div className="flex items-center justify-between text-sm font-bold">
                                <span>{mod.title}</span>
                                <span className="text-xs font-mono text-neutral-500">
                                  {mod.duration}
                                </span>
                              </div>
                              <ul className="mt-2 text-xs text-neutral-700 space-y-1">
                                {mod.topics.map((t, ti) => (
                                  <li key={ti}>· {t}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white border border-neutral-200 p-6 text-sm text-neutral-600">
                    No active programme assigned yet.
                  </div>
                )}

                {data.onboardingTemplate && (
                  <div className="bg-white border border-neutral-200 p-6 space-y-4">
                    <h3 className="text-base font-bold text-[#111111]">
                      Student Onboarding &amp; Readiness Guide
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div>
                        <div className="font-semibold mb-1">
                          Required Software
                        </div>
                        <ul className="text-xs text-neutral-700 space-y-1">
                          {data.onboardingTemplate.softwareRequirements.map(
                            (item, i) => (
                              <li key={i}>· {item}</li>
                            )
                          )}
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">
                          Hardware Requirements
                        </div>
                        <ul className="text-xs text-neutral-700 space-y-1">
                          {data.onboardingTemplate.hardwareRequirements.map(
                            (item, i) => (
                              <li key={i}>· {item}</li>
                            )
                          )}
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">
                          Communication Channels
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed">
                          {data.onboardingTemplate.communicationChannels}
                        </p>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">
                          Assignment &amp; Training Policies
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed">
                          {data.onboardingTemplate.trainingPolicies}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'assignments' && (
              <div className="space-y-6">
                <div className="bg-white border border-neutral-200 p-6">
                  <h2 className="text-lg font-bold mb-4">
                    Practical Assignments &amp; Submissions
                  </h2>
                  {data.assignments.length === 0 ? (
                    <p className="text-sm text-neutral-600">
                      No assignments have been published for your cohort yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {data.assignments.map((assign) => {
                        const sub = data.submissions.find(
                          (s) => s.assignmentId === assign.id
                        );
                        return (
                          <div
                            key={assign.id}
                            className="border border-neutral-200 p-5 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-[#111111]">
                                  {assign.title}
                                </h3>
                                <div className="text-xs text-neutral-500 mt-0.5 font-mono tabular-nums">
                                  Deadline: {assign.deadline} · Max Score:{' '}
                                  {assign.maxScore}
                                </div>
                              </div>
                              <span className="text-xs font-mono font-semibold text-[#F9501E]">
                                {sub ? sub.status : 'NOT SUBMITTED'}
                              </span>
                            </div>

                            <p className="text-sm text-neutral-700">
                              {assign.description}
                            </p>
                            <div className="text-xs text-neutral-600">
                              Requirements: {assign.submissionRequirements}
                            </div>

                            {assign.resourceUrl && (
                              <a
                                href={assign.resourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block text-xs font-medium text-[#F9501E] underline"
                              >
                                {assign.resourceLabel || 'Open Learning Resource'}
                              </a>
                            )}

                            {sub && (
                              <div className="bg-[#F9F8F6] border border-neutral-200 p-3.5 text-xs space-y-1">
                                <div>
                                  Submitted Link:{' '}
                                  <a
                                    href={sub.submissionUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline font-mono"
                                  >
                                    {sub.submissionUrl}
                                  </a>
                                </div>
                                {sub.score !== null && (
                                  <div className="font-bold text-[#111111]">
                                    Score: {sub.score} / {assign.maxScore}
                                  </div>
                                )}
                                {sub.feedback && (
                                  <div className="text-neutral-700">
                                    Instructor Feedback: {sub.feedback}
                                  </div>
                                )}
                              </div>
                            )}

                            {activeAssignmentId === assign.id ? (
                              <form
                                onSubmit={handleAssignmentSubmit}
                                className="space-y-3 pt-2 border-t border-neutral-200"
                              >
                                <input
                                  type="url"
                                  required
                                  value={submissionUrl}
                                  onChange={(e) =>
                                    setSubmissionUrl(e.target.value)
                                  }
                                  placeholder="https://github.com/... or live deployed URL"
                                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                                />
                                <textarea
                                  rows={2}
                                  value={submissionNotes}
                                  onChange={(e) =>
                                    setSubmissionNotes(e.target.value)
                                  }
                                  placeholder="Notes for your instructor (optional)"
                                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    disabled={submittingWork}
                                    className="px-4 py-2 bg-[#F9501E] text-white text-xs font-semibold"
                                  >
                                    {submittingWork
                                      ? 'Submitting...'
                                      : 'Submit Assignment'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveAssignmentId(null)}
                                    className="px-4 py-2 border border-neutral-300 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAssignmentId(assign.id);
                                  setSubmissionUrl(sub?.submissionUrl || '');
                                  setSubmissionNotes(sub?.notes || '');
                                }}
                                className="px-4 py-2 bg-[#111111] text-white text-xs font-medium hover:bg-neutral-800"
                              >
                                {sub ? 'Update Submission' : 'Submit Work'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'attendance' && (
              <div className="space-y-6">
                <div className="bg-white border border-neutral-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Attendance Register</h2>
                    <span className="font-mono font-bold text-lg text-[#F9501E] tabular-nums">
                      {data.attendanceRate}% Overall
                    </span>
                  </div>
                  {data.attendance.length === 0 ? (
                    <p className="text-sm text-neutral-600">
                      No session attendance recorded yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="border-b border-neutral-200 text-xs text-neutral-500">
                          <tr>
                            <th className="py-2 pr-4">Date</th>
                            <th className="py-2 pr-4">Topic</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {data.attendance.map((att) => (
                            <tr key={att.id}>
                              <td className="py-2.5 pr-4 font-mono text-xs tabular-nums">
                                {att.sessionDate}
                              </td>
                              <td className="py-2.5 pr-4">
                                {att.sessionTopic || 'Training Session'}
                              </td>
                              <td className="py-2.5 pr-4 font-mono text-xs font-semibold">
                                {att.status}
                              </td>
                              <td className="py-2.5 text-neutral-600 text-xs">
                                {att.instructorNotes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-neutral-200 p-6">
                  <h2 className="text-lg font-bold mb-4">
                    Assessments &amp; Instructor Evaluations
                  </h2>
                  {data.assessments.length === 0 ? (
                    <p className="text-sm text-neutral-600">
                      No evaluations recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-neutral-200 text-sm">
                      {data.assessments.map((as) => (
                        <div
                          key={as.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-semibold text-[#111111]">
                              {as.title}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {as.assessmentType}
                              {as.evaluationNotes
                                ? ` · ${as.evaluationNotes}`
                                : ''}
                            </div>
                          </div>
                          <div className="font-mono font-bold tabular-nums text-[#111111]">
                            {as.score} / {as.maxScore}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'finance' && (
              <div className="space-y-6">
                {/* 4-Metric Financial Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-neutral-200 p-5">
                    <div className="text-xs text-neutral-500">
                      Total Programme Fee
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-[#111111] mt-1">
                      {currency}{' '}
                      {(data.financialSummary?.totalProgrammeFee ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500 mt-1">
                      {data.financialSummary?.planType === 'WEEKLY_INSTALMENTS'
                        ? 'Option B — Weekly Instalments'
                        : 'Option A — Full Payment'}
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 p-5">
                    <div className="text-xs text-neutral-500">
                      Verified Paid
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                      {currency}{' '}
                      {(data.financialSummary?.amountPaid ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 p-5">
                    <div className="text-xs text-neutral-500">
                      Outstanding Balance
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-[#F9501E] mt-1">
                      {currency}{' '}
                      {(
                        data.financialSummary?.outstandingBalance ?? 0
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 p-5">
                    <div className="text-xs text-neutral-500">
                      Next Due &amp; Account Status
                    </div>
                    <div
                      className={`text-sm font-bold font-mono mt-1.5 ${
                        formatPolicyLabel(data.financialSummary?.overallStatus)
                          .className
                      }`}
                    >
                      {
                        formatPolicyLabel(data.financialSummary?.overallStatus)
                          .text
                      }
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500 mt-1 tabular-nums">
                      {data.financialSummary?.nextDueDate
                        ? `Due ${data.financialSummary.nextDueDate}${
                            data.financialSummary.graceDeadline
                              ? ` · Grace ${data.financialSummary.graceDeadline}`
                              : ''
                          }`
                        : 'No balance due'}
                    </div>
                  </div>
                </div>

                {/* Payment Policy & Bank Details */}
                {data.instituteContact && (
                  <div className="bg-white border border-neutral-200 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-2">
                      <h2 className="text-sm font-bold text-[#111111]">
                        Institute Settlement Bank Account
                      </h2>
                      <div className="text-xs text-neutral-700 space-y-1 font-mono">
                        <div>
                          Bank:{' '}
                          <span className="font-bold text-[#111111]">
                            {data.instituteContact.bankName || 'On Invoice'}
                          </span>
                        </div>
                        <div>
                          Account Name:{' '}
                          <span className="font-bold text-[#111111]">
                            {data.instituteContact.accountName ||
                              data.instituteContact.instituteName}
                          </span>
                        </div>
                        <div>
                          Account Number:{' '}
                          <span className="font-bold text-[#F9501E]">
                            {data.instituteContact.accountNumber || 'See Proforma'}
                          </span>
                        </div>
                      </div>
                      {data.instituteContact.paymentInstructions && (
                        <p className="text-xs text-neutral-600 pt-1">
                          {data.instituteContact.paymentInstructions}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 border-t lg:border-t-0 lg:border-l border-neutral-200 pt-4 lg:pt-0 lg:pl-6">
                      <h2 className="text-sm font-bold text-[#111111]">
                        Considerate Payment &amp; Verification Policy
                      </h2>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {data.instituteContact.paymentPolicySummary ||
                          `Reminders are sent ${
                            data.instituteContact.reminderHoursBeforeDue ?? 48
                          } hours before due dates with a ${
                            data.instituteContact.gracePeriodHours ?? 48
                          }-hour grace period when delays are communicated. Receipts are generated strictly after Finance Office verification.`}
                      </p>
                      <div className="text-[11px] font-mono text-neutral-500">
                        Pre-due reminder:{' '}
                        {data.instituteContact.reminderHoursBeforeDue ?? 48}h ·
                        Grace window:{' '}
                        {data.instituteContact.gracePeriodHours ?? 48}h ·
                        Online Paystack:{' '}
                        {data.paystackConfigured
                          ? 'Active'
                          : 'Manual Transfer Verification Active'}
                      </div>
                    </div>
                  </div>
                )}

                {financeNotice && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                    {financeNotice}
                  </div>
                )}
                {financeError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm">
                    {financeError}
                  </div>
                )}

                <div className="bg-white border border-neutral-200 p-6">
                  <h2 className="text-lg font-bold mb-4">Proforma Invoices</h2>
                  {data.invoices.length === 0 ? (
                    <p className="text-sm text-neutral-600">
                      No invoices issued to your account yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {data.invoices.map((inv) => {
                        const badge = formatPolicyLabel(inv.policyState);
                        const scheduleLabel =
                          inv.invoiceType === 'WEEKLY_INSTALMENT'
                            ? `Week ${inv.instalmentNumber} of ${inv.totalInstalments} Instalment`
                            : 'Full Programme Payment';
                        const isFormOpen = proofInvoiceId === inv.id;

                        return (
                          <div
                            key={inv.id}
                            className="border border-neutral-200 p-5 space-y-4"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="text-sm space-y-1">
                                <div className="font-mono font-bold text-[#111111] flex flex-wrap items-center gap-2">
                                  <span>{inv.invoiceNumber}</span>
                                  <span className="text-neutral-400">·</span>
                                  <span className="text-neutral-700 font-sans font-semibold text-xs">
                                    {scheduleLabel}
                                  </span>
                                  <span className="text-neutral-400">·</span>
                                  <span className={badge.className}>
                                    {badge.text}
                                  </span>
                                </div>
                                <div className="text-neutral-700">
                                  {inv.programmeTitle} · Due{' '}
                                  <span className="font-mono tabular-nums font-medium">
                                    {inv.dueDate}
                                  </span>
                                  {inv.graceDeadline && inv.balanceDue > 0 && (
                                    <span className="text-xs text-neutral-500 font-mono tabular-nums">
                                      {' '}
                                      · Grace until {inv.graceDeadline}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-mono text-neutral-500 tabular-nums">
                                  Total: {currency}{' '}
                                  {inv.totalPayable.toLocaleString()} · Paid:{' '}
                                  {currency} {inv.amountPaid.toLocaleString()} ·
                                  Balance:{' '}
                                  <span className="font-bold text-[#111111]">
                                    {currency} {inv.balanceDue.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadProformaInvoicePdf(
                                      inv,
                                      data.instituteContact
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50 whitespace-nowrap"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Invoice PDF
                                </button>

                                {inv.balanceDue > 0 && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={financeBusy}
                                      onClick={() => {
                                        if (isFormOpen) {
                                          setProofInvoiceId(null);
                                        } else {
                                          setProofInvoiceId(inv.id);
                                          setProofAmount(String(inv.balanceDue));
                                          setProofPayerName(
                                            data.profile?.fullName ||
                                              inv.recipientName
                                          );
                                          setFinanceError(null);
                                          setFinanceNotice(null);
                                        }
                                      }}
                                      className="px-3.5 py-2 bg-[#111111] text-white text-xs font-medium hover:bg-neutral-800 whitespace-nowrap"
                                    >
                                      {isFormOpen
                                        ? 'Close Transfer Form'
                                        : 'Submit Transfer Proof'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={financeBusy}
                                      onClick={() => handleStartPaystack(inv)}
                                      className="px-3.5 py-2 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316] disabled:opacity-60 whitespace-nowrap"
                                    >
                                      Pay via Paystack
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isFormOpen && inv.balanceDue > 0 && (
                              <form
                                onSubmit={handleSubmitTransferProof}
                                className="border-t border-neutral-200 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#F9F8F6] p-4"
                              >
                                <div className="sm:col-span-2 lg:col-span-3 text-xs text-neutral-600">
                                  Submitting transfer proof creates a{' '}
                                  <span className="font-mono font-semibold text-[#111111]">
                                    PENDING_VERIFICATION
                                  </span>{' '}
                                  record. Official receipts are issued strictly
                                  after Finance Office bank reconciliation.
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Amount Transferred ({currency}) *
                                  </label>
                                  <input
                                    type="number"
                                    required
                                    min={1}
                                    max={inv.balanceDue}
                                    value={proofAmount}
                                    onChange={(e) =>
                                      setProofAmount(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white font-mono tabular-nums"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Sender Account Name *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={proofPayerName}
                                    onChange={(e) =>
                                      setProofPayerName(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Bank Session / NIP Reference *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={proofRef}
                                    onChange={(e) =>
                                      setProofRef(e.target.value)
                                    }
                                    placeholder="e.g. 000014261114..."
                                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Transfer Date *
                                  </label>
                                  <input
                                    type="date"
                                    required
                                    value={proofDate}
                                    onChange={(e) =>
                                      setProofDate(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium mb-1">
                                    Notes / Bank Name (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={proofNotes}
                                    onChange={(e) =>
                                      setProofNotes(e.target.value)
                                    }
                                    placeholder="e.g. GTBank transfer for Week 1 instalment"
                                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                                  />
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
                                  <button
                                    type="submit"
                                    disabled={financeBusy}
                                    className="px-4 py-2 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316] disabled:opacity-60 whitespace-nowrap"
                                  >
                                    {financeBusy
                                      ? 'Submitting...'
                                      : 'Log Transfer Proof for Verification'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setProofInvoiceId(null)}
                                    className="px-4 py-2 border border-neutral-300 bg-white text-xs whitespace-nowrap"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payment History & Verification Log */}
                <div className="bg-white border border-neutral-200 p-6">
                  <h2 className="text-lg font-bold mb-1">
                    Submitted Payments &amp; Verification History
                  </h2>
                  <p className="text-xs text-neutral-500 mb-4">
                    Only transactions marked VERIFIED issue Official Receipts
                    and reduce your outstanding balance.
                  </p>
                  {data.payments.length === 0 ? (
                    <p className="text-sm text-neutral-600">
                      No payment submissions logged yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="border-b border-neutral-200 text-xs text-neutral-500">
                          <tr>
                            <th className="py-2 pr-4">Date</th>
                            <th className="py-2 pr-4">Reference</th>
                            <th className="py-2 pr-4">Method / Payer</th>
                            <th className="py-2 pr-4 text-right">Amount</th>
                            <th className="py-2">Verification Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 text-xs">
                          {data.payments.map((pay) => (
                            <tr key={pay.id}>
                              <td className="py-2.5 pr-4 font-mono tabular-nums">
                                {pay.paymentDate}
                              </td>
                              <td className="py-2.5 pr-4 font-mono font-semibold">
                                {pay.transactionReference}
                              </td>
                              <td className="py-2.5 pr-4">
                                {pay.paymentMethod}
                                {pay.payerName ? ` · ${pay.payerName}` : ''}
                              </td>
                              <td className="py-2.5 pr-4 text-right font-mono font-bold tabular-nums">
                                {currency} {pay.amount.toLocaleString()}
                              </td>
                              <td
                                className={`py-2.5 font-mono font-semibold ${
                                  pay.verificationStatus === 'VERIFIED'
                                    ? 'text-emerald-700'
                                    : pay.verificationStatus === 'REJECTED'
                                      ? 'text-red-700'
                                      : 'text-amber-700'
                                }`}
                              >
                                {pay.verificationStatus}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-neutral-200 p-6">
                  <h2 className="text-lg font-bold mb-4">Official Receipts</h2>
                  {data.receipts.length === 0 ? (
                    <p className="text-sm text-neutral-600">
                      Official receipts appear here only after payment has been
                      verified by our Finance Office.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {data.receipts.map((rct) => (
                        <div
                          key={rct.id}
                          className="border border-neutral-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="text-sm">
                            <div className="font-mono font-bold text-emerald-700">
                              {rct.receiptNumber}
                            </div>
                            <div className="text-neutral-700">
                              {currency} {rct.amountReceived.toLocaleString()} ·{' '}
                              {rct.paymentMethod} · {rct.paymentDate}
                            </div>
                            <div className="text-xs font-mono text-neutral-500 tabular-nums">
                              Ref: {rct.transactionReference} · Remaining:{' '}
                              {currency} {rct.outstandingBalance.toLocaleString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              downloadOfficialReceiptPdf(
                                rct,
                                data.invoices.find((i) => i.id === rct.invoiceId),
                                data.instituteContact
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50 shrink-0 whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Receipt PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-neutral-200 p-6">
                  <h2 className="text-lg font-bold mb-4">
                    Student Financial Ledger
                  </h2>
                  {data.ledger.length === 0 ? (
                    <p className="text-sm text-neutral-600">No ledger entries.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="border-b border-neutral-200 text-xs text-neutral-500">
                          <tr>
                            <th className="py-2 pr-4">Ref</th>
                            <th className="py-2 pr-4">Description</th>
                            <th className="py-2 pr-4 text-right">Debit</th>
                            <th className="py-2 pr-4 text-right">Credit</th>
                            <th className="py-2 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 font-mono text-xs tabular-nums">
                          {data.ledger.map((entry) => (
                            <tr key={entry.id}>
                              <td className="py-2.5 pr-4 font-semibold">
                                {entry.referenceNumber}
                              </td>
                              <td className="py-2.5 pr-4 font-sans">
                                {entry.description}
                              </td>
                              <td className="py-2.5 pr-4 text-right">
                                {entry.debitAmount > 0
                                  ? entry.debitAmount.toLocaleString()
                                  : '—'}
                              </td>
                              <td className="py-2.5 pr-4 text-right text-emerald-700">
                                {entry.creditAmount > 0
                                  ? entry.creditAmount.toLocaleString()
                                  : '—'}
                              </td>
                              <td className="py-2.5 text-right font-bold">
                                {entry.runningBalance.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'certificates' && (
              <div className="bg-white border border-neutral-200 p-6 space-y-4">
                <h2 className="text-lg font-bold">My Certificates</h2>
                {data.certificates.length === 0 ? (
                  <p className="text-sm text-neutral-600">
                    Your official certificate will become downloadable here once
                    you complete all programme requirements and administration
                    approves issuance.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="border border-neutral-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-mono font-bold text-[#F9501E] text-sm">
                            {cert.certificateNumber} · {cert.status}
                          </div>
                          <div className="font-bold text-lg text-[#111111] mt-0.5">
                            {cert.programmeTitle}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            Completed {cert.completionDate} · Verification Code:{' '}
                            <span className="font-mono text-[#111111]">
                              {cert.verificationCode}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            downloadCertificatePdf(cert, data.instituteContact)
                          }
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316] shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          Download Certificate PDF
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'notifications' && (
              <div className="bg-white border border-neutral-200 p-6 space-y-4">
                <h2 className="text-lg font-bold">Notifications</h2>
                {data.notifications.length === 0 ? (
                  <p className="text-sm text-neutral-600">No notifications yet.</p>
                ) : (
                  <div className="divide-y divide-neutral-200">
                    {data.notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`py-4 flex items-start justify-between gap-4 ${
                          n.isRead ? 'opacity-75' : ''
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-[#111111]">
                            {n.title}
                          </div>
                          <p className="text-sm text-neutral-600 mt-1">
                            {n.message}
                          </p>
                          <div className="text-xs font-mono text-neutral-400 mt-1">
                            {n.eventType} · {n.createdAt.slice(0, 10)}
                          </div>
                        </div>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#F9501E] shrink-0"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark read
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
