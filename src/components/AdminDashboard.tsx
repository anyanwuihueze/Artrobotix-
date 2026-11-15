import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  ApplicationRecord,
  AppUser,
  AssessmentRecord,
  AssignmentRecord,
  AttendanceRecord,
  AuditLogRecord,
  CertificateRecord,
  Cohort,
  InstituteSettings,
  Invoice,
  LedgerEntry,
  NotificationRecord,
  PaymentPlan,
  PaymentRecord,
  Programme,
  ReceiptRecord,
  StudentFinancialSummary,
  StudentProfile,
  SubmissionRecord,
} from '../types';
import AdminAdmissionsTab from './admin/AdminAdmissionsTab';
import AdminFinanceTab from './admin/AdminFinanceTab';
import AdminAcademicsTab from './admin/AdminAcademicsTab';
import AdminReportsSettingsTab from './admin/AdminReportsSettingsTab';
import BrandEmblem from './BrandEmblem';

type AdminTab =
  | 'overview'
  | 'applications'
  | 'students'
  | 'programmes'
  | 'cohorts'
  | 'invoices'
  | 'payments'
  | 'receipts'
  | 'attendance'
  | 'assignments'
  | 'assessments'
  | 'certificates'
  | 'reports'
  | 'notifications'
  | 'settings';

export default function AdminDashboard({
  onBackToPublic,
}: {
  onBackToPublic: () => void;
}) {
  const { dbUser, logout, apiFetch } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [financialSummaries, setFinancialSummaries] = useState<
    StudentFinancialSummary[]
  >([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [settings, setSettings] = useState<InstituteSettings | null>(null);
  const [integrations, setIntegrations] = useState({
    paystackConfigured: false,
    resendConfigured: false,
  });
  const [analytics, setAnalytics] = useState<any>(null);

  // Cross-module bridges
  const [prefillInvoiceApp, setPrefillInvoiceApp] =
    useState<ApplicationRecord | null>(null);
  const [prefillEnrolApp, setPrefillEnrolApp] =
    useState<ApplicationRecord | null>(null);

  const role = dbUser?.role || 'STUDENT';
  const canFinance = ['SUPER_ADMIN', 'ADMINISTRATOR', 'FINANCE_OFFICER'].includes(
    role
  );
  const canAdmin = ['SUPER_ADMIN', 'ADMINISTRATOR'].includes(role);

  const loadAll = useCallback(
    async (analyticsFilters?: {
      programmeId?: string;
      from?: string;
      to?: string;
    }) => {
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (analyticsFilters?.programmeId)
          qs.set('programmeId', analyticsFilters.programmeId);
        if (analyticsFilters?.from) qs.set('from', analyticsFilters.from);
        if (analyticsFilters?.to) qs.set('to', analyticsFilters.to);
        const analyticsUrl = `/api/admin/analytics${
          qs.toString() ? `?${qs.toString()}` : ''
        }`;

        const [
          analyticsRes,
          progsRes,
          cohortsRes,
          appsRes,
          studentsRes,
          attRes,
          assignRes,
          subRes,
          assessRes,
          certRes,
          notifRes,
          settingsRes,
          auditRes,
          invRes,
          plansRes,
          summariesRes,
          payRes,
          recRes,
          ledgerRes,
          usersRes,
        ] = await Promise.all([
          apiFetch(analyticsUrl),
          apiFetch<Programme[]>('/api/admin/programmes'),
          apiFetch<Cohort[]>('/api/admin/cohorts'),
          apiFetch<ApplicationRecord[]>('/api/admin/applications'),
          apiFetch<StudentProfile[]>('/api/admin/students'),
          apiFetch<AttendanceRecord[]>('/api/admin/attendance'),
          apiFetch<AssignmentRecord[]>('/api/admin/assignments'),
          apiFetch<SubmissionRecord[]>('/api/admin/submissions'),
          apiFetch<AssessmentRecord[]>('/api/admin/assessments'),
          apiFetch<CertificateRecord[]>('/api/admin/certificates'),
          apiFetch<NotificationRecord[]>('/api/admin/notifications'),
          apiFetch<{
            settings: InstituteSettings;
            integrations: {
              paystackConfigured: boolean;
              resendConfigured: boolean;
            };
          }>('/api/admin/settings'),
          apiFetch<AuditLogRecord[]>('/api/admin/audit-logs'),
          canFinance ? apiFetch<Invoice[]>('/api/admin/invoices') : Promise.resolve([]),
          canFinance
            ? apiFetch<PaymentPlan[]>('/api/admin/payment-plans')
            : Promise.resolve([]),
          canFinance
            ? apiFetch<StudentFinancialSummary[]>('/api/admin/financial-summaries')
            : Promise.resolve([]),
          canFinance
            ? apiFetch<PaymentRecord[]>('/api/admin/payments')
            : Promise.resolve([]),
          canFinance
            ? apiFetch<ReceiptRecord[]>('/api/admin/receipts')
            : Promise.resolve([]),
          canFinance
            ? apiFetch<LedgerEntry[]>('/api/admin/ledger')
            : Promise.resolve([]),
          canAdmin ? apiFetch<AppUser[]>('/api/admin/users') : Promise.resolve([]),
        ]);

        setAnalytics(analyticsRes);
        setProgrammes(progsRes);
        setCohorts(cohortsRes);
        setApplications(appsRes);
        setStudents(studentsRes);
        setAttendance(attRes);
        setAssignments(assignRes);
        setSubmissions(subRes);
        setAssessments(assessRes);
        setCertificates(certRes);
        setNotifications(notifRes);
        setSettings(settingsRes.settings);
        setIntegrations(settingsRes.integrations);
        setAuditLogs(auditRes);
        setInvoices(invRes);
        setPaymentPlans(plansRes);
        setFinancialSummaries(summariesRes);
        setPayments(payRes);
        setReceipts(recRes);
        setLedger(ledgerRes);
        setUsers(usersRes);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load administrative data.'
        );
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, canFinance, canAdmin]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    visible: boolean;
  }[] = [
    {
      id: 'overview',
      label: 'OVERVIEW',
      icon: <LayoutDashboard className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'applications',
      label: 'APPLICATIONS',
      icon: <ClipboardList className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'students',
      label: 'STUDENTS',
      icon: <Users className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'programmes',
      label: 'PROGRAMMES',
      icon: <BookOpen className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'cohorts',
      label: 'COHORTS',
      icon: <Layers className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'invoices',
      label: 'INVOICES',
      icon: <FileText className="w-4 h-4" />,
      visible: canFinance,
    },
    {
      id: 'payments',
      label: 'PAYMENTS',
      icon: <CreditCard className="w-4 h-4" />,
      visible: canFinance,
    },
    {
      id: 'receipts',
      label: 'RECEIPTS',
      icon: <Receipt className="w-4 h-4" />,
      visible: canFinance,
    },
    {
      id: 'attendance',
      label: 'ATTENDANCE',
      icon: <CalendarCheck className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'assignments',
      label: 'ASSIGNMENTS',
      icon: <CheckSquare className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'assessments',
      label: 'ASSESSMENTS',
      icon: <GraduationCap className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'certificates',
      label: 'CERTIFICATES',
      icon: <Award className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'reports',
      label: 'REPORTS',
      icon: <BarChart3 className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'notifications',
      label: 'NOTIFICATIONS',
      icon: <Bell className="w-4 h-4" />,
      visible: true,
    },
    {
      id: 'settings',
      label: 'SETTINGS',
      icon: <Settings className="w-4 h-4" />,
      visible: true,
    },
  ];

  const currency = settings?.currency || 'NGN';
  const metrics = analytics?.metrics;

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#111111] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 lg:shrink-0 bg-[#111111] text-white flex flex-col">
        <div className="h-20 px-5 flex items-center justify-between border-b border-neutral-800">
          <button
            type="button"
            onClick={onBackToPublic}
            className="group flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F9501E]/60 rounded-sm"
          >
            <BrandEmblem size="sm" tone="dark" alt="Artdrobotix" />
            <span className="font-display font-bold text-xs tracking-wider whitespace-nowrap group-hover:text-white transition-colors">
              ARTDROBOTIX ADMIN
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden p-2 text-neutral-300 hover:text-white"
            aria-label="Toggle admin menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav
          className={`${
            mobileNavOpen ? 'block' : 'hidden'
          } lg:block flex-1 p-2.5 space-y-0.5 overflow-y-auto`}
        >
          {navItems
            .filter((n) => n.visible)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold tracking-wide transition-colors ${
                  tab === item.id
                    ? 'bg-[#F9501E] text-white'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            ))}
        </nav>

        <div className="hidden lg:block p-4 border-t border-neutral-800 text-xs space-y-2">
          <div>
            <div className="font-semibold text-white truncate">
              {dbUser?.fullName}
            </div>
            <div className="font-mono text-[11px] text-[#F9501E] mt-0.5">
              {dbUser?.role}
            </div>
          </div>
          <button
            type="button"
            onClick={onBackToPublic}
            className="block text-neutral-300 hover:text-white py-1"
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
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract for Dashboard */}
        <header className="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="text-sm font-semibold text-[#111111] truncate">
            Artdrobotix Digital Campus /{' '}
            <span className="text-[#F9501E] font-mono text-xs uppercase">
              {tab}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onBackToPublic}
              className="px-3 py-1.5 border border-neutral-300 text-xs font-medium hover:bg-neutral-50 whitespace-nowrap"
            >
              View Public Site
            </button>
            <button
              type="button"
              onClick={logout}
              className="lg:hidden px-3 py-1.5 bg-[#111111] text-white text-xs font-medium whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="bg-white border border-neutral-200 p-8 text-sm text-neutral-600">
              Loading institutional database...
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 p-6 text-sm text-red-800">
              {error}
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-neutral-200 p-5">
                      <div className="text-xs text-neutral-500">
                        Total Applications
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                        {metrics?.totalApplications ?? 0}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                        {metrics?.pendingApplications ?? 0} awaiting review
                      </div>
                    </div>
                    <div className="bg-white border border-neutral-200 p-5">
                      <div className="text-xs text-neutral-500">
                        Enrolled Students
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                        {metrics?.enrolledStudents ?? 0}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                        {metrics?.activeStudents ?? 0} active ·{' '}
                        {metrics?.completedStudents ?? 0} completed
                      </div>
                    </div>
                    <div className="bg-white border border-neutral-200 p-5">
                      <div className="text-xs text-neutral-500">
                        Verified Revenue
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                        {currency}{' '}
                        {(metrics?.totalRevenue ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                        {metrics?.verifiedPaymentsCount ?? 0} verified payments
                      </div>
                    </div>
                    <div className="bg-white border border-neutral-200 p-5">
                      <div className="text-xs text-neutral-500">
                        Outstanding Balances
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-[#F9501E] mt-1">
                        {currency}{' '}
                        {(metrics?.outstandingPayments ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                        {metrics?.certificatesIssued ?? 0} certificates issued
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white border border-neutral-200 p-6">
                    <h2 className="text-base font-bold text-[#111111] mb-4">
                      Quick Administrative Actions
                    </h2>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => setTab('applications')}
                        className="px-4 py-2 bg-[#111111] text-white text-xs font-medium hover:bg-neutral-800"
                      >
                        Review Applications
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('students')}
                        className="px-4 py-2 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316]"
                      >
                        Enrol / Add Student
                      </button>
                      {canFinance && (
                        <>
                          <button
                            type="button"
                            onClick={() => setTab('invoices')}
                            className="px-4 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
                          >
                            Create Invoice
                          </button>
                          <button
                            type="button"
                            onClick={() => setTab('payments')}
                            className="px-4 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
                          >
                            Verify Payment / Receipt
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setTab('programmes')}
                        className="px-4 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
                      >
                        Manage Programmes
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('attendance')}
                        className="px-4 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
                      >
                        Record Attendance
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('assignments')}
                        className="px-4 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
                      >
                        Create Assignment
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('certificates')}
                        className="px-4 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
                      >
                        Issue Certificate
                      </button>
                    </div>
                  </div>

                  {/* Pending Admissions & Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-neutral-200 p-6">
                      <h3 className="text-sm font-bold mb-3">
                        Recent Applications
                      </h3>
                      {applications.length === 0 ? (
                        <p className="text-xs text-neutral-500">
                          No applications submitted yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-neutral-200 text-xs">
                          {applications.slice(0, 5).map((app) => (
                            <div
                              key={app.id}
                              className="py-2.5 flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-mono font-bold text-[#F9501E] mr-2">
                                  {app.referenceNumber}
                                </span>
                                <span className="font-medium">
                                  {app.fullName}
                                </span>
                                <div className="text-neutral-500">
                                  {app.programmeName}
                                </div>
                              </div>
                              <span className="font-mono font-semibold">
                                {app.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-neutral-200 p-6">
                      <h3 className="text-sm font-bold mb-3">
                        Recent Audit Trail
                      </h3>
                      {auditLogs.length === 0 ? (
                        <p className="text-xs text-neutral-500">
                          No audit events logged yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-neutral-200 text-xs">
                          {auditLogs.slice(0, 5).map((log) => (
                            <div
                              key={log.id}
                              className="py-2.5 flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-mono font-semibold text-[#111111]">
                                  {log.action}
                                </span>
                                <div className="text-neutral-500">
                                  {log.actorEmail} · {log.entityType}:
                                  {log.entityId}
                                </div>
                              </div>
                              <span className="font-mono text-neutral-400 tabular-nums">
                                {log.createdAt.slice(0, 10)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'applications' && (
                <AdminAdmissionsTab
                  applications={applications}
                  programmes={programmes}
                  cohorts={cohorts}
                  apiFetch={apiFetch}
                  onRefresh={loadAll}
                  onInitiateInvoice={(app) => {
                    setPrefillInvoiceApp(app);
                    setTab('invoices');
                  }}
                  onInitiateEnrol={(app) => {
                    setPrefillEnrolApp(app);
                    setTab('students');
                  }}
                />
              )}

              {(tab === 'invoices' ||
                tab === 'payments' ||
                tab === 'receipts') && (
                <AdminFinanceTab
                  section={tab}
                  programmes={programmes}
                  students={students}
                  applications={applications}
                  paymentPlans={paymentPlans}
                  financialSummaries={financialSummaries}
                  invoices={invoices}
                  payments={payments}
                  receipts={receipts}
                  ledger={ledger}
                  settings={settings}
                  prefillApplicant={prefillInvoiceApp}
                  onClearPrefill={() => setPrefillInvoiceApp(null)}
                  apiFetch={apiFetch}
                  onRefresh={loadAll}
                />
              )}

              {(tab === 'students' ||
                tab === 'programmes' ||
                tab === 'cohorts' ||
                tab === 'attendance' ||
                tab === 'assignments' ||
                tab === 'assessments' ||
                tab === 'certificates') && (
                <AdminAcademicsTab
                  section={tab}
                  programmes={programmes}
                  cohorts={cohorts}
                  students={students}
                  applications={applications}
                  attendance={attendance}
                  assignments={assignments}
                  submissions={submissions}
                  assessments={assessments}
                  certificates={certificates}
                  settings={settings}
                  prefillEnrolApp={prefillEnrolApp}
                  onClearPrefillEnrol={() => setPrefillEnrolApp(null)}
                  apiFetch={apiFetch}
                  onRefresh={loadAll}
                />
              )}

              {(tab === 'reports' ||
                tab === 'notifications' ||
                tab === 'settings') && (
                <AdminReportsSettingsTab
                  section={tab}
                  programmes={programmes}
                  analytics={analytics}
                  notifications={notifications}
                  auditLogs={auditLogs}
                  settings={settings}
                  integrations={integrations}
                  users={users}
                  currentUserRole={role}
                  apiFetch={apiFetch}
                  onRefresh={loadAll}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
