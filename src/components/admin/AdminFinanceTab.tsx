import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Download,
  Plus,
  Printer,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  ApplicationRecord,
  InstituteSettings,
  Invoice,
  LedgerEntry,
  PaymentPlan,
  PaymentPlanChoice,
  PaymentRecord,
  PolicyState,
  Programme,
  ReceiptRecord,
  StudentFinancialSummary,
  StudentProfile,
} from '../../types';
import {
  downloadOfficialReceiptPdf,
  downloadProformaInvoicePdf,
} from '../../lib/pdfGenerator';

interface Props {
  section: 'invoices' | 'payments' | 'receipts';
  programmes: Programme[];
  students: StudentProfile[];
  applications: ApplicationRecord[];
  paymentPlans: PaymentPlan[];
  financialSummaries: StudentFinancialSummary[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  receipts: ReceiptRecord[];
  ledger: LedgerEntry[];
  settings: InstituteSettings | null;
  prefillApplicant?: ApplicationRecord | null;
  onClearPrefill?: () => void;
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
}

function addDaysLocal(dateStr: string, days: number): string {
  const parsed = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function policyStatusStyle(state?: PolicyState | string): string {
  switch (state) {
    case 'PAID':
      return 'text-emerald-700';
    case 'PART_PAID':
      return 'text-amber-700';
    case 'DUE_SOON':
      return 'text-[#F9501E]';
    case 'GRACE_PERIOD':
      return 'text-amber-800';
    case 'OVERDUE':
      return 'text-red-700';
    default:
      return 'text-neutral-700';
  }
}

export default function AdminFinanceTab({
  section,
  programmes,
  students,
  applications,
  paymentPlans,
  financialSummaries,
  invoices,
  payments,
  receipts,
  ledger,
  settings,
  prefillApplicant,
  onClearPrefill,
  apiFetch,
  onRefresh,
}: Props) {
  const currency = settings?.currency || 'NGN';
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Summary filter
  const [summaryFilter, setSummaryFilter] = useState<
    'ALL' | 'OUTSTANDING' | 'ATTENTION' | 'PAID'
  >('ALL');

  // Billing Plan & Invoice Generator state
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [billingMode, setBillingMode] = useState<'PLAN' | 'CUSTOM'>('PLAN');
  const [planType, setPlanType] = useState<PaymentPlanChoice>('FULL_PAYMENT');
  const [invTargetType, setInvTargetType] = useState<'applicant' | 'student'>(
    'applicant'
  );
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [trainingDuration, setTrainingDuration] = useState(
    '3 Weeks (27 Practical Hours)'
  );
  const [trainingFormat, setTrainingFormat] = useState('Hybrid');
  const [weeklyFeeAmount, setWeeklyFeeAmount] = useState<number>(430000);
  const [totalWeeks, setTotalWeeks] = useState<number>(3);
  const [programmeFee, setProgrammeFee] = useState<number>(1290000);
  const [discount, setDiscount] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [paymentArrangement, setPaymentArrangement] = useState('Full payment');
  const [paymentInstructions, setPaymentInstructions] = useState(
    settings?.paymentInstructions || ''
  );

  // Payment Recorder state
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => {
    if (prefillApplicant) {
      setShowCreateInvoice(true);
      setBillingMode('PLAN');
      setPlanType(
        prefillApplicant.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
          ? 'WEEKLY_INSTALMENTS'
          : 'FULL_PAYMENT'
      );
      setInvTargetType('applicant');
      setSelectedAppId(String(prefillApplicant.id));
      setRecipientName(prefillApplicant.fullName);
      setRecipientEmail(prefillApplicant.email);
      setRecipientPhone(prefillApplicant.phone);
      const prog =
        programmes.find((p) => p.id === prefillApplicant.programmeId) ||
        programmes[0];
      if (prog) {
        const wkFee =
          prog.weeklyFeeAmount ??
          Math.round(prog.feeAmount / Math.max(1, prog.durationWeeks || 3));
        const wks = prog.durationWeeks || 3;
        setProgrammeId(String(prog.id));
        setTrainingDuration(prog.durationText);
        setTrainingFormat(prefillApplicant.preferredFormat || prog.deliveryFormat);
        setWeeklyFeeAmount(wkFee);
        setTotalWeeks(wks);
        setProgrammeFee(prog.feeAmount);
      }
      setPaymentInstructions(settings?.paymentInstructions || '');
      onClearPrefill?.();
    }
  }, [prefillApplicant, programmes, settings, onClearPrefill]);

  const handleSelectTarget = (type: 'applicant' | 'student', idStr: string) => {
    if (type === 'student') {
      setSelectedStudentId(idStr);
      const stu = students.find((s) => String(s.id) === idStr);
      if (stu) {
        setRecipientName(stu.fullName);
        setRecipientEmail(stu.email);
        setRecipientPhone(stu.phone);
        setPlanType(
          stu.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
            ? 'WEEKLY_INSTALMENTS'
            : 'FULL_PAYMENT'
        );
        const prog = programmes.find((p) => p.id === stu.programmeId);
        if (prog) {
          const wkFee =
            prog.weeklyFeeAmount ??
            Math.round(prog.feeAmount / Math.max(1, prog.durationWeeks || 3));
          const wks = prog.durationWeeks || 3;
          setProgrammeId(String(prog.id));
          setTrainingDuration(prog.durationText);
          setTrainingFormat(prog.deliveryFormat);
          setWeeklyFeeAmount(wkFee);
          setTotalWeeks(wks);
          setProgrammeFee(prog.feeAmount);
        }
      }
    } else {
      setSelectedAppId(idStr);
      const app = applications.find((a) => String(a.id) === idStr);
      if (app) {
        setRecipientName(app.fullName);
        setRecipientEmail(app.email);
        setRecipientPhone(app.phone);
        setPlanType(
          app.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
            ? 'WEEKLY_INSTALMENTS'
            : 'FULL_PAYMENT'
        );
        const prog = programmes.find((p) => p.id === app.programmeId);
        if (prog) {
          const wkFee =
            prog.weeklyFeeAmount ??
            Math.round(prog.feeAmount / Math.max(1, prog.durationWeeks || 3));
          const wks = prog.durationWeeks || 3;
          setProgrammeId(String(prog.id));
          setTrainingDuration(prog.durationText);
          setTrainingFormat(app.preferredFormat || prog.deliveryFormat);
          setWeeklyFeeAmount(wkFee);
          setTotalWeeks(wks);
          setProgrammeFee(prog.feeAmount);
        }
      }
    }
  };

  const planTotalFee = weeklyFeeAmount * totalWeeks;
  const subtotal =
    billingMode === 'PLAN' ? Number(planTotalFee || 0) : Number(programmeFee || 0);
  const totalPayable = Math.max(
    0,
    subtotal - Number(discount || 0) + Number(additionalCharges || 0)
  );

  // Preview of generated invoices for PLAN mode
  const planPreviewInvoices = (() => {
    const count = planType === 'WEEKLY_INSTALMENTS' ? Math.max(1, totalWeeks) : 1;
    const baseAmt = Math.floor(totalPayable / count);
    const rem = totalPayable - baseAmt * count;
    const graceDays = Math.max(
      1,
      Math.round((settings?.gracePeriodHours ?? 48) / 24)
    );
    return Array.from({ length: count }, (_, idx) => {
      const invDue =
        planType === 'WEEKLY_INSTALMENTS'
          ? addDaysLocal(dueDate, idx * 7)
          : dueDate;
      return {
        label:
          planType === 'WEEKLY_INSTALMENTS'
            ? `Week ${idx + 1} of ${count} Instalment`
            : 'Full Programme Invoice',
        dueDate: invDue,
        graceDeadline: addDaysLocal(invDue, graceDays),
        amount: baseAmt + (idx === 0 ? rem : 0),
      };
    });
  })();

  const handleRunReminders = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{
        checkedCount: number;
        sentCount: number;
        invoiceNumbers: string[];
      }>('/api/admin/reminders/run', { method: 'POST' });
      setNotice(
        res.sentCount > 0
          ? `Dispatched ${res.sentCount} pre-deadline payment reminder(s): ${res.invoiceNumbers.join(', ')}`
          : `Checked ${res.checkedCount} unpaid invoice(s) — no new reminders due inside the reminder window.`
      );
      await onRefresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to run payment reminders.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const prog = programmes.find((p) => String(p.id) === programmeId);
      const commonRecipient = {
        studentProfileId:
          invTargetType === 'student' && selectedStudentId
            ? Number(selectedStudentId)
            : null,
        applicationId:
          invTargetType === 'applicant' && selectedAppId
            ? Number(selectedAppId)
            : null,
        recipientName,
        recipientEmail,
        recipientPhone,
        programmeId: prog?.id || null,
        programmeTitle: prog?.title || 'Artdrobotix Technology Training',
        trainingDuration,
        trainingFormat,
        discount: Number(discount || 0),
        additionalCharges: Number(additionalCharges || 0),
        paymentInstructions,
      };

      if (billingMode === 'PLAN') {
        const res = await apiFetch<{
          paymentPlan: PaymentPlan;
          invoices: Invoice[];
        }>('/api/admin/payment-plans', {
          method: 'POST',
          body: JSON.stringify({
            ...commonRecipient,
            planType,
            weeklyFeeAmount: Number(weeklyFeeAmount),
            totalWeeks: Number(totalWeeks),
            commencementDate: dueDate,
          }),
        });
        setNotice(
          `Billing Plan ${res.paymentPlan.planCode} (${
            planType === 'WEEKLY_INSTALMENTS'
              ? `${res.invoices.length} weekly invoices`
              : 'Full Payment invoice'
          }) generated and posted to ledger.`
        );
      } else {
        const created = await apiFetch<Invoice>('/api/admin/invoices', {
          method: 'POST',
          body: JSON.stringify({
            ...commonRecipient,
            programmeFee: Number(programmeFee || 0),
            dueDate,
            paymentArrangement,
          }),
        });
        setNotice(`Proforma Invoice ${created.invoiceNumber} created and logged.`);
      }
      setShowCreateInvoice(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice.');
    } finally {
      setBusy(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/admin/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: Number(payInvoiceId),
          amount: Number(payAmount),
          paymentMethod: payMethod,
          transactionReference: payRef,
          paymentDate: payDate,
          notes: payNotes,
        }),
      });
      setNotice(
        'Payment logged as PENDING_VERIFICATION. Verify it below to issue an Official Receipt.'
      );
      setPayRef('');
      setPayAmount('');
      setPayNotes('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log payment.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyPayment = async (
    paymentId: number,
    decision: 'VERIFIED' | 'REJECTED'
  ) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{
        payment: PaymentRecord;
        receipt: ReceiptRecord | null;
      }>(`/api/admin/payments/${paymentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setNotice(
        res.receipt
          ? `Payment verified and Official Receipt ${res.receipt.receiptNumber} issued.`
          : 'Payment marked as rejected.'
      );
      await onRefresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Payment verification failed.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePaystackCheck = async (invId: number, amount: number) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ authorizationUrl: string; reference: string }>(
        '/api/admin/payments/paystack/initialize',
        {
          method: 'POST',
          body: JSON.stringify({ invoiceId: invId, amount }),
        }
      );
      setNotice(
        `Paystack session initialized (${res.reference}). Link: ${res.authorizationUrl}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Paystack not configured — use manual verification.'
      );
    } finally {
      setBusy(false);
    }
  };

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

      {section === 'invoices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#111111]">
                Billing Plans &amp; Proforma Invoices
              </h2>
              <p className="text-xs text-neutral-500">
                Issue Full Payment or 3-Week Instalment plans ({paymentPlans.length}{' '}
                active plans) and manage pre-deadline reminders.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={handleRunReminders}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-neutral-300 bg-white text-xs font-medium hover:bg-neutral-50 whitespace-nowrap"
              >
                <Bell className="w-3.5 h-3.5 text-[#F9501E]" />
                Run {settings?.reminderHoursBeforeDue ?? 48}h Reminders
              </button>
              <button
                type="button"
                onClick={() => setShowCreateInvoice(!showCreateInvoice)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316] whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Generate Billing Plan / Invoice
              </button>
            </div>
          </div>

          {showCreateInvoice && (
            <form
              onSubmit={handleCreateInvoice}
              className="bg-white border border-neutral-200 p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                <h3 className="font-bold text-base">
                  Billing Plan &amp; Proforma Invoice Generator
                </h3>
                <div className="inline-flex border border-neutral-300 p-0.5 bg-[#F9F8F6] text-xs">
                  <button
                    type="button"
                    onClick={() => setBillingMode('PLAN')}
                    className={`px-3 py-1 font-medium whitespace-nowrap ${
                      billingMode === 'PLAN'
                        ? 'bg-[#111111] text-white'
                        : 'text-neutral-700'
                    }`}
                  >
                    Structured Payment Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingMode('CUSTOM')}
                    className={`px-3 py-1 font-medium whitespace-nowrap ${
                      billingMode === 'CUSTOM'
                        ? 'bg-[#111111] text-white'
                        : 'text-neutral-700'
                    }`}
                  >
                    Single Custom Invoice
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Bill To Type
                  </label>
                  <select
                    value={invTargetType}
                    onChange={(e) =>
                      setInvTargetType(
                        e.target.value as 'applicant' | 'student'
                      )
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                  >
                    <option value="applicant">Accepted / Reviewing Applicant</option>
                    <option value="student">Enrolled Student</option>
                  </select>
                </div>

                {invTargetType === 'applicant' ? (
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Select Applicant
                    </label>
                    <select
                      value={selectedAppId}
                      onChange={(e) =>
                        handleSelectTarget('applicant', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                    >
                      <option value="">Manual entry or choose applicant...</option>
                      {applications.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.referenceNumber} — {a.fullName} (
                          {a.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
                            ? 'Weekly'
                            : 'Full'}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Select Enrolled Student
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) =>
                        handleSelectTarget('student', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                    >
                      <option value="">Choose student...</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.admissionNumber} — {s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Recipient Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Programme *
                  </label>
                  <select
                    value={programmeId}
                    onChange={(e) => {
                      const p = programmes.find(
                        (pr) => String(pr.id) === e.target.value
                      );
                      setProgrammeId(e.target.value);
                      if (p) {
                        const wkFee =
                          p.weeklyFeeAmount ??
                          Math.round(
                            p.feeAmount / Math.max(1, p.durationWeeks || 3)
                          );
                        setWeeklyFeeAmount(wkFee);
                        setTotalWeeks(p.durationWeeks || 3);
                        setProgrammeFee(p.feeAmount);
                        setTrainingDuration(p.durationText);
                        setTrainingFormat(p.deliveryFormat);
                      }
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                  >
                    <option value="">Select programme...</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({currency} {p.feeAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Training Duration
                  </label>
                  <input
                    type="text"
                    value={trainingDuration}
                    onChange={(e) => setTrainingDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>

                {billingMode === 'PLAN' ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Payment Plan Option *
                      </label>
                      <select
                        value={planType}
                        onChange={(e) =>
                          setPlanType(e.target.value as PaymentPlanChoice)
                        }
                        className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                      >
                        <option value="FULL_PAYMENT">
                          Option A — Full Payment (1 Invoice Upfront)
                        </option>
                        <option value="WEEKLY_INSTALMENTS">
                          Option B — Weekly Instalments ({totalWeeks} Weekly Invoices)
                        </option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Weekly Fee ({currency})
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={weeklyFeeAmount}
                          onChange={(e) =>
                            setWeeklyFeeAmount(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Weeks
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={24}
                          value={totalWeeks}
                          onChange={(e) =>
                            setTotalWeeks(Math.max(1, Number(e.target.value)))
                          }
                          className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Custom Invoice Fee ({currency}) *
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={programmeFee}
                        onChange={(e) => setProgrammeFee(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Payment Arrangement
                      </label>
                      <select
                        value={paymentArrangement}
                        onChange={(e) => setPaymentArrangement(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                      >
                        <option value="Full payment">Full payment</option>
                        <option value="Approved instalments">
                          Approved instalments
                        </option>
                        <option value="Sponsored">Sponsored</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Discount ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Additional Charges ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={additionalCharges}
                    onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    {billingMode === 'PLAN'
                      ? 'Week 1 / Commencement Due Date *'
                      : 'Payment Due Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Training Format
                  </label>
                  <select
                    value={trainingFormat}
                    onChange={(e) => setTrainingFormat(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="In-person">In-person</option>
                    <option value="Online live sessions">
                      Online live sessions
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Payment Instructions
                </label>
                <textarea
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>

              {billingMode === 'PLAN' && (
                <div className="border border-neutral-200 p-4 bg-[#F9F8F6] space-y-2">
                  <div className="text-xs font-bold text-[#111111]">
                    Generated Invoice Schedule Preview
                  </div>
                  <div className="divide-y divide-neutral-200 text-xs font-mono tabular-nums">
                    {planPreviewInvoices.map((p, idx) => (
                      <div
                        key={idx}
                        className="py-1.5 flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="font-sans font-medium text-[#111111]">
                          {p.label}
                        </span>
                        <span className="text-neutral-600">
                          Due {p.dueDate} (Grace until {p.graceDeadline})
                        </span>
                        <span className="font-bold text-[#F9501E]">
                          {currency} {p.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#F9F8F6] border border-neutral-200 p-4 flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="font-mono tabular-nums space-x-6">
                  <span>
                    Subtotal: {currency} {subtotal.toLocaleString()}
                  </span>
                  <span>
                    Discount: - {currency} {discount.toLocaleString()}
                  </span>
                  <span className="font-bold text-[#F9501E]">
                    Net Payable: {currency} {totalPayable.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateInvoice(false)}
                    className="px-4 py-2 border border-neutral-300 text-xs whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800 whitespace-nowrap"
                  >
                    {busy
                      ? 'Generating...'
                      : billingMode === 'PLAN'
                        ? 'Generate Plan & Invoices'
                        : 'Save & Generate Invoice'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Student Financial Accounts Summary */}
          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#111111]">
                  Student Financial Accounts Summary
                </h3>
                <p className="text-xs text-neutral-500">
                  Total programme fee, verified amount paid, outstanding balance,
                  and next due date per student/applicant.
                </p>
              </div>
              <div className="inline-flex border border-neutral-200 p-0.5 bg-[#F9F8F6] text-xs">
                {(
                  [
                    ['ALL', 'All Accounts'],
                    ['OUTSTANDING', 'Outstanding'],
                    ['ATTENTION', 'Due / Grace / Overdue'],
                    ['PAID', 'Fully Paid'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSummaryFilter(k)}
                    className={`px-2.5 py-1 font-medium whitespace-nowrap ${
                      summaryFilter === k
                        ? 'bg-[#111111] text-white'
                        : 'text-neutral-600 hover:text-[#111111]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {financialSummaries.length === 0 ? (
              <div className="p-6 text-xs text-neutral-500 text-center">
                No student financial accounts created yet.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-neutral-600">
                  <tr>
                    <th className="py-2.5 px-4">Student / Applicant</th>
                    <th className="py-2.5 px-4">Programme &amp; Plan</th>
                    <th className="py-2.5 px-4 text-right">Total Fee</th>
                    <th className="py-2.5 px-4 text-right">Paid</th>
                    <th className="py-2.5 px-4 text-right">Outstanding</th>
                    <th className="py-2.5 px-4">Next Due</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {financialSummaries
                    .filter((s) => {
                      if (summaryFilter === 'OUTSTANDING')
                        return s.outstandingBalance > 0;
                      if (summaryFilter === 'ATTENTION')
                        return ['DUE_SOON', 'GRACE_PERIOD', 'OVERDUE'].includes(
                          s.overallStatus
                        );
                      if (summaryFilter === 'PAID')
                        return s.outstandingBalance === 0;
                      return true;
                    })
                    .map((acc) => (
                      <tr key={acc.accountKey} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-[#111111]">
                            {acc.recipientName}
                          </div>
                          <div className="text-neutral-500 font-mono">
                            {acc.admissionNumber || acc.recipientEmail}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-neutral-800">
                            {acc.programmeTitle}
                          </div>
                          <div className="text-neutral-500 font-mono">
                            {acc.planType === 'WEEKLY_INSTALMENTS'
                              ? `Weekly Instalments (${acc.paidInvoiceCount}/${acc.invoiceCount} paid)`
                              : 'Full Payment'}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {currency} {acc.totalProgrammeFee.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                          {currency} {acc.amountPaid.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-[#F9501E]">
                          {currency} {acc.outstandingBalance.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-neutral-600">
                          {acc.nextDueDate ? (
                            <div>
                              <div>{acc.nextDueDate}</div>
                              {acc.graceDeadline && (
                                <div className="text-[11px] text-neutral-400">
                                  Grace {acc.graceDeadline}
                                </div>
                              )}
                            </div>
                          ) : (
                            'Settled'
                          )}
                        </td>
                        <td
                          className={`py-2.5 px-4 font-mono font-semibold whitespace-nowrap ${policyStatusStyle(
                            acc.overallStatus
                          )}`}
                        >
                          {acc.overallStatus}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Invoices Table */}
          <div className="bg-white border border-neutral-200 overflow-x-auto">
            {invoices.length === 0 ? (
              <div className="p-8 text-sm text-neutral-600 text-center">
                No proforma invoices generated yet.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                  <tr>
                    <th className="py-3 px-4">Invoice No.</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Schedule / Due</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4">Policy Status</th>
                    <th className="py-3 px-4 text-right">PDF / Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-[#111111] whitespace-nowrap">
                        <div>{inv.invoiceNumber}</div>
                        <div className="text-[11px] font-normal text-neutral-500">
                          {inv.invoiceType === 'WEEKLY_INSTALMENT'
                            ? `WK ${inv.instalmentNumber}/${inv.totalInstalments}`
                            : 'FULL'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{inv.recipientName}</div>
                        <div className="text-xs text-neutral-500">
                          {inv.programmeTitle}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums">
                        <div>Due {inv.dueDate}</div>
                        {inv.graceDeadline && (
                          <div className="text-[11px] text-neutral-400">
                            Grace {inv.graceDeadline}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                        {inv.totalPayable.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-emerald-700">
                        {inv.amountPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums font-bold text-[#F9501E]">
                        {inv.balanceDue.toLocaleString()}
                      </td>
                      <td
                        className={`py-3 px-4 font-mono text-xs font-semibold whitespace-nowrap ${policyStatusStyle(
                          inv.policyState || inv.status
                        )}`}
                      >
                        {inv.policyState || inv.status}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => downloadProformaInvoicePdf(inv, settings)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-neutral-300 text-xs hover:bg-neutral-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-neutral-300 text-xs hover:bg-neutral-100"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {section === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
              <div>
                <h2 className="text-lg font-bold">
                  Record &amp; Verify Payments
                </h2>
                <p className="text-xs text-neutral-500">
                  Payments start as PENDING_VERIFICATION. Receipts are issued
                  strictly after finance verification.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleRecordPayment}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1">
                  Related Invoice *
                </label>
                <select
                  required
                  value={payInvoiceId}
                  onChange={(e) => {
                    setPayInvoiceId(e.target.value);
                    const inv = invoices.find(
                      (i) => String(i.id) === e.target.value
                    );
                    if (inv) setPayAmount(String(inv.balanceDue));
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="">Select unpaid/part-paid invoice...</option>
                  {invoices
                    .filter((i) => i.balanceDue > 0)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.invoiceNumber} — {i.recipientName} (Bal:{' '}
                        {i.balanceDue.toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Amount ({currency}) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="POS / Card">POS / Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Sponsorship">Sponsorship</option>
                  <option value="Paystack">Paystack</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Transaction Reference *
                </label>
                <input
                  type="text"
                  required
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Bank / NIP / POS Ref"
                  className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Instalment 1, etc."
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800"
                >
                  Log Payment for Verification
                </button>
                {payInvoiceId && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      handlePaystackCheck(
                        Number(payInvoiceId),
                        Number(payAmount || 0)
                      )
                    }
                    className="px-4 py-2.5 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
                  >
                    Initialize Paystack Link
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transaction Ref &amp; Source</th>
                  <th className="py-3 px-4">Method &amp; Payer</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Finance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-neutral-500 text-sm"
                    >
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((pay) => (
                    <tr key={pay.id}>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums">
                        {pay.paymentDate}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-mono font-semibold">
                          {pay.transactionReference}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-500">
                          {pay.submittedByRole === 'STUDENT'
                            ? 'STUDENT TRANSFER PROOF'
                            : pay.submittedByRole || 'ADMIN'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div>
                          {pay.paymentMethod}
                          {pay.payerName ? ` · ${pay.payerName}` : ''}
                        </div>
                        {(pay.proofNotes || pay.notes) && (
                          <div className="text-[11px] text-neutral-500">
                            {pay.proofNotes || pay.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums font-bold">
                        {currency} {pay.amount.toLocaleString()}
                      </td>
                      <td
                        className={`py-3 px-4 font-mono text-xs font-semibold ${
                          pay.verificationStatus === 'VERIFIED'
                            ? 'text-emerald-700'
                            : pay.verificationStatus === 'REJECTED'
                              ? 'text-red-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {pay.verificationStatus}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        {pay.verificationStatus === 'PENDING_VERIFICATION' ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleVerifyPayment(pay.id, 'VERIFIED')
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#16A34A] text-white text-xs font-semibold hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verify &amp; Issue Receipt
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleVerifyPayment(pay.id, 'REJECTED')
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-300 text-red-700 text-xs hover:bg-red-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-neutral-500">
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'receipts' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <div className="p-5 border-b border-neutral-200">
              <h2 className="text-lg font-bold">Official Payment Receipts</h2>
              <p className="text-xs text-neutral-500">
                Generated strictly after verified payment reconciliation.
              </p>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Receipt No.</th>
                  <th className="py-3 px-4">Student / Recipient</th>
                  <th className="py-3 px-4">Method &amp; Ref</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-right">Balance Left</th>
                  <th className="py-3 px-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {receipts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-neutral-500 text-sm"
                    >
                      No official receipts issued yet. Verify a payment first.
                    </td>
                  </tr>
                ) : (
                  receipts.map((rct) => (
                    <tr key={rct.id}>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-emerald-700">
                        {rct.receiptNumber}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {rct.studentName}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {rct.paymentMethod} ·{' '}
                        <span className="font-mono">
                          {rct.transactionReference}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums font-bold">
                        {currency} {rct.amountReceived.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                        {currency} {rct.outstandingBalance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            downloadOfficialReceiptPdf(
                              rct,
                              invoices.find((i) => i.id === rct.invoiceId),
                              settings
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#111111] text-white text-xs font-medium hover:bg-neutral-800"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Receipt PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Institutional Ledger */}
          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Student Account Ledger</h3>
                <p className="text-xs text-neutral-500">
                  Chronological debit and credit entries across student accounts.
                </p>
              </div>
              <ShieldAlert className="w-4 h-4 text-neutral-400" />
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-2.5 px-4">Reference</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Debit</th>
                  <th className="py-2.5 px-4 text-right">Credit</th>
                  <th className="py-2.5 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-mono text-xs tabular-nums">
                {ledger.slice(0, 30).map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 px-4 font-semibold">
                      {row.referenceNumber}
                    </td>
                    <td className="py-2.5 px-4 font-sans">{row.description}</td>
                    <td className="py-2.5 px-4 text-right">
                      {row.debitAmount > 0
                        ? row.debitAmount.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700">
                      {row.creditAmount > 0
                        ? row.creditAmount.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold">
                      {row.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
