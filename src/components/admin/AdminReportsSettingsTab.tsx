import React, { useEffect, useState } from 'react';
import { Download, Send, ShieldCheck } from 'lucide-react';
import {
  AppUser,
  AuditLogRecord,
  InstituteSettings,
  NotificationRecord,
  Programme,
  UserRole,
} from '../../types';
import {
  downloadAnalyticsReportPdf,
  downloadCsvReport,
} from '../../lib/pdfGenerator';

interface AnalyticsPayload {
  metrics: {
    totalApplications: number;
    pendingApplications: number;
    acceptedApplications: number;
    enrolledStudents: number;
    activeStudents: number;
    completedStudents: number;
    totalRevenue: number;
    outstandingPayments: number;
    partialPaymentsCount: number;
    verifiedPaymentsCount: number;
    certificatesIssued: number;
    conversionRate: number;
    completionRate: number;
    avgAttendance: number;
  };
  programmeStats: {
    programmeId: number;
    code: string;
    title: string;
    feeAmount: number;
    applications: number;
    enrolled: number;
    revenue: number;
  }[];
  monthlyTrends: {
    month: string;
    applications: number;
    enrolments: number;
    revenue: number;
  }[];
  recentAuditLogs: AuditLogRecord[];
}

interface Props {
  section: 'reports' | 'notifications' | 'settings';
  programmes: Programme[];
  analytics: AnalyticsPayload | null;
  notifications: NotificationRecord[];
  auditLogs: AuditLogRecord[];
  settings: InstituteSettings | null;
  integrations: { paystackConfigured: boolean; resendConfigured: boolean };
  users: AppUser[];
  currentUserRole: UserRole;
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  onRefresh: (filters?: {
    programmeId?: string;
    from?: string;
    to?: string;
  }) => Promise<void>;
}

export default function AdminReportsSettingsTab({
  section,
  programmes,
  analytics,
  notifications,
  auditLogs,
  settings,
  integrations,
  users,
  currentUserRole,
  apiFetch,
  onRefresh,
}: Props) {
  const currency = settings?.currency || 'NGN';
  const [filterProg, setFilterProg] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Notification composer
  const [notifTo, setNotifTo] = useState('');
  const [notifType, setNotifType] = useState('TRAINING_REMINDER');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    instituteName: '',
    descriptor: '',
    supportEmail: '',
    whatsappNumbers: '',
    address: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    paymentInstructions: '',
    reminderHoursBeforeDue: 48,
    gracePeriodHours: 48,
    paymentPolicySummary: '',
    instructorName: '',
    instructorTitle: '',
    instructorBio: '',
    instructorPortfolioUrl: '',
    instructorGithubUrl: '',
    instructorLinkedinUrl: '',
  });

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        instituteName: settings.instituteName || '',
        descriptor: settings.descriptor || '',
        supportEmail: settings.supportEmail || '',
        whatsappNumbers: settings.whatsappNumbers || '',
        address: settings.address || '',
        bankName: settings.bankName || '',
        accountName: settings.accountName || '',
        accountNumber: settings.accountNumber || '',
        paymentInstructions: settings.paymentInstructions || '',
        reminderHoursBeforeDue: settings.reminderHoursBeforeDue ?? 48,
        gracePeriodHours: settings.gracePeriodHours ?? 48,
        paymentPolicySummary: settings.paymentPolicySummary || '',
        instructorName: settings.instructorName || '',
        instructorTitle: settings.instructorTitle || '',
        instructorBio: settings.instructorBio || '',
        instructorPortfolioUrl: settings.instructorPortfolioUrl || '',
        instructorGithubUrl: settings.instructorGithubUrl || '',
        instructorLinkedinUrl: settings.instructorLinkedinUrl || '',
      });
    }
  }, [settings]);

  const applyAnalyticsFilters = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRefresh({
      programmeId: filterProg || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
    });
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ emailStatus: string }>(
        '/api/admin/notifications/send',
        {
          method: 'POST',
          body: JSON.stringify({
            recipientEmail: notifTo,
            eventType: notifType,
            title: notifTitle,
            message: notifMessage,
          }),
        }
      );
      setNotice(
        `In-app notification logged. Email delivery status: ${res.emailStatus}`
      );
      setNotifTo('');
      setNotifTitle('');
      setNotifMessage('');
      await onRefresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to dispatch notification.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settingsForm),
      });
      setNotice('Institutional settings & instructor profile updated.');
      await onRefresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save settings.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (userId: number, role: UserRole) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setNotice('User role updated.');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role update failed.');
    }
  };

  const maxTrendApps = Math.max(
    1,
    ...(analytics?.monthlyTrends.map((m) => m.applications) || [1])
  );
  const maxTrendRev = Math.max(
    1,
    ...(analytics?.monthlyTrends.map((m) => m.revenue) || [1])
  );
  const maxProgApps = Math.max(
    1,
    ...(analytics?.programmeStats.map((p) => p.applications) || [1])
  );

  return (
    <div className="space-y-6">
      {notice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* MODULE F: BUSINESS INTELLIGENCE & REPORTS */}
      {section === 'reports' && analytics && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <form
              onSubmit={applyAnalyticsFilters}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1"
            >
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  Programme
                </label>
                <select
                  value={filterProg}
                  onChange={(e) => setFilterProg(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="">All Programmes</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800"
                >
                  Apply Filters
                </button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  downloadCsvReport(
                    `ARTDROBOTIX-Programme-BI-${new Date()
                      .toISOString()
                      .slice(0, 10)}.csv`,
                    ['Code', 'Programme', 'Fee', 'Applications', 'Enrolled', 'Verified Revenue'],
                    analytics.programmeStats.map((r) => [
                      r.code,
                      r.title,
                      r.feeAmount,
                      r.applications,
                      r.enrolled,
                      r.revenue,
                    ])
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadAnalyticsReportPdf(
                    analytics.metrics,
                    analytics.programmeStats,
                    settings
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316]"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF Report
              </button>
            </div>
          </div>

          {/* BI KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-neutral-200 p-4">
              <div className="text-xs text-neutral-500">Conversion Rate</div>
              <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                {analytics.metrics.conversionRate}%
              </div>
            </div>
            <div className="bg-white border border-neutral-200 p-4">
              <div className="text-xs text-neutral-500">Completion Rate</div>
              <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                {analytics.metrics.completionRate}%
              </div>
            </div>
            <div className="bg-white border border-neutral-200 p-4">
              <div className="text-xs text-neutral-500">Avg Attendance</div>
              <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                {analytics.metrics.avgAttendance}%
              </div>
            </div>
            <div className="bg-white border border-neutral-200 p-4">
              <div className="text-xs text-neutral-500">Verified Revenue</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {currency} {analytics.metrics.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="bg-white border border-neutral-200 p-4">
              <div className="text-xs text-neutral-500">Outstanding</div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#F9501E] mt-1">
                {currency} {analytics.metrics.outstandingPayments.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Visual Charts from Live DB Records */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-neutral-200 p-6">
              <h3 className="text-sm font-bold text-[#111111] mb-4">
                Programme Popularity &amp; Revenue
              </h3>
              <div className="space-y-4">
                {analytics.programmeStats.map((row) => (
                  <div key={row.programmeId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate pr-2">
                        {row.title}
                      </span>
                      <span className="font-mono tabular-nums text-neutral-600 shrink-0">
                        {row.applications} apps · {row.enrolled} enrolled ·{' '}
                        {currency} {row.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2.5 bg-neutral-100 w-full">
                      <div
                        className="h-full bg-[#F9501E]"
                        style={{
                          width: `${Math.round(
                            (row.applications / maxProgApps) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-neutral-200 p-6">
              <h3 className="text-sm font-bold text-[#111111] mb-4">
                Monthly Application &amp; Revenue Trends
              </h3>
              {analytics.monthlyTrends.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Monthly trend bars will appear automatically as applications
                  and verified payments are recorded.
                </p>
              ) : (
                <div className="space-y-4">
                  {analytics.monthlyTrends.map((m) => (
                    <div key={m.month} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono tabular-nums">
                        <span className="font-bold">{m.month}</span>
                        <span>
                          {m.applications} apps · {m.enrolments} enrolled ·{' '}
                          {currency} {m.revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-2 bg-neutral-100">
                          <div
                            className="h-full bg-[#111111]"
                            style={{
                              width: `${Math.round(
                                (m.applications / maxTrendApps) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="h-2 bg-neutral-100">
                          <div
                            className="h-full bg-[#F9501E]"
                            style={{
                              width: `${Math.round(
                                (m.revenue / maxTrendRev) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {section === 'notifications' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSendNotification}
            className="bg-white border border-neutral-200 p-6 space-y-4"
          >
            <h2 className="text-lg font-bold">Dispatch Notification</h2>
            <p className="text-xs text-neutral-500">
              Resend Email Provider:{' '}
              <span className="font-mono font-semibold text-[#111111]">
                {integrations.resendConfigured
                  ? 'CONFIGURED (Live Email Active)'
                  : 'NOT CONFIGURED (In-App logged only; set RESEND_API_KEY to enable live emails)'}
              </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  required
                  value={notifTo}
                  onChange={(e) => setNotifTo(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Event Type
                </label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="TRAINING_REMINDER">Training Reminder</option>
                  <option value="PAYMENT_REMINDER">
                    Outstanding Payment Reminder
                  </option>
                  <option value="ASSIGNMENT_DEADLINE">
                    Assignment Deadline Approaching
                  </option>
                  <option value="PROGRAMME_COMPLETED">
                    Programme Completed
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Subject / Title *
                </label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
            </div>
            <textarea
              rows={2}
              required
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder="Message body..."
              className="w-full px-3 py-2 border border-neutral-300 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold"
            >
              <Send className="w-3.5 h-3.5" />
              Send Notification
            </button>
          </form>

          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Event</th>
                  <th className="py-2.5 px-4">Title</th>
                  <th className="py-2.5 px-4">Channel</th>
                  <th className="py-2.5 px-4">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td className="py-2.5 px-4 font-medium">
                      {n.recipientEmail}
                    </td>
                    <td className="py-2.5 px-4 font-mono">{n.eventType}</td>
                    <td className="py-2.5 px-4">{n.title}</td>
                    <td className="py-2.5 px-4 font-mono">{n.channel}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold">
                      {n.deliveryStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTINGS, ROLES & AUDIT LOGS */}
      {section === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 p-6">
            <h2 className="text-lg font-bold mb-2">
              External Integration Readiness
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="border border-neutral-200 p-4">
                <div className="font-bold text-[#111111]">Paystack Gateway</div>
                <div className="mt-1 font-mono text-neutral-600">
                  {integrations.paystackConfigured
                    ? 'Configured (PAYSTACK_SECRET_KEY active)'
                    : 'Manual Verification Active (Set PAYSTACK_SECRET_KEY to enable)'}
                </div>
              </div>
              <div className="border border-neutral-200 p-4">
                <div className="font-bold text-[#111111]">Resend Email API</div>
                <div className="mt-1 font-mono text-neutral-600">
                  {integrations.resendConfigured
                    ? 'Configured (Live Email Delivery)'
                    : 'In-App Only (Set RESEND_API_KEY to enable)'}
                </div>
              </div>
              <div className="border border-neutral-200 p-4">
                <div className="font-bold text-[#111111]">
                  WhatsApp Extension
                </div>
                <div className="mt-1 font-mono text-neutral-600">
                  Architecture prepared (Connect Meta Cloud API / Twilio to enable)
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSaveSettings}
            className="bg-white border border-neutral-200 p-6 space-y-5"
          >
            <h2 className="text-lg font-bold border-b border-neutral-200 pb-2">
              Institute Settings &amp; Instructor Profile
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Institute Name
                </label>
                <input
                  type="text"
                  value={settingsForm.instituteName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      instituteName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settingsForm.supportEmail}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      supportEmail: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  WhatsApp Numbers
                </label>
                <input
                  type="text"
                  value={settingsForm.whatsappNumbers}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      whatsappNumbers: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={settingsForm.bankName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      bankName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={settingsForm.accountName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      accountName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={settingsForm.accountNumber}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      accountNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Default Invoice Payment Instructions
              </label>
              <textarea
                rows={2}
                value={settingsForm.paymentInstructions}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    paymentInstructions: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-neutral-300 text-sm"
              />
            </div>

            <div className="border-t border-neutral-200 pt-4 space-y-4">
              <h3 className="text-sm font-bold text-[#111111]">
                Payment Reminder &amp; Grace Period Policy
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Reminder Window Before Due Date (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={336}
                    value={settingsForm.reminderHoursBeforeDue}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        reminderHoursBeforeDue: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Grace Period After Due Date (Hours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={336}
                    value={settingsForm.gracePeriodHours}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        gracePeriodHours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Public Payment Policy Summary
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.paymentPolicySummary}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      paymentPolicySummary: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Lead Instructor Name
                </label>
                <input
                  type="text"
                  value={settingsForm.instructorName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      instructorName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Instructor Title
                </label>
                <input
                  type="text"
                  value={settingsForm.instructorTitle}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      instructorTitle: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Portfolio URL
                </label>
                <input
                  type="url"
                  value={settingsForm.instructorPortfolioUrl}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      instructorPortfolioUrl: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  GitHub URL
                </label>
                <input
                  type="url"
                  value={settingsForm.instructorGithubUrl}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      instructorGithubUrl: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Instructor Bio
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.instructorBio}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      instructorBio: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 bg-[#F9501E] text-white text-xs font-semibold"
            >
              Save Settings &amp; Profile
            </button>
          </form>

          {/* Role-Based Access Control (SUPER_ADMIN) */}
          <div className="bg-white border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#F9501E]" />
              <h3 className="text-base font-bold">
                User Accounts &amp; Role Permissions
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                  <tr>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2.5 px-3 font-semibold">{u.fullName}</td>
                      <td className="py-2.5 px-3">{u.email}</td>
                      <td className="py-2.5 px-3">
                        {currentUserRole === 'SUPER_ADMIN' ? (
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value as UserRole)
                            }
                            className="px-2 py-1 border border-neutral-300 bg-white font-mono"
                          >
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                            <option value="INSTRUCTOR">INSTRUCTOR</option>
                            <option value="FINANCE_OFFICER">
                              FINANCE_OFFICER
                            </option>
                            <option value="STUDENT">STUDENT</option>
                          </select>
                        ) : (
                          <span className="font-mono font-semibold">
                            {u.role}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-white border border-neutral-200 p-6 space-y-3">
            <h3 className="text-base font-bold">Security &amp; Audit Trail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-neutral-600">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Actor</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-mono">
                  {auditLogs.slice(0, 20).map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 px-3 tabular-nums text-neutral-500">
                        {log.createdAt.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-2 px-3">
                        {log.actorEmail} ({log.actorRole})
                      </td>
                      <td className="py-2 px-3 font-semibold">{log.action}</td>
                      <td className="py-2 px-3">
                        {log.entityType}:{log.entityId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
