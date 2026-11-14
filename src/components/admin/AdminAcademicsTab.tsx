import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  Edit3,
  Plus,
  UserPlus,
  X,
} from 'lucide-react';
import {
  ApplicationRecord,
  AssessmentRecord,
  AssignmentRecord,
  AttendanceRecord,
  CertificateRecord,
  Cohort,
  InstituteSettings,
  PaymentPlanChoice,
  Programme,
  StudentProfile,
  SubmissionRecord,
  WeeklyDeliverable,
} from '../../types';
import {
  downloadAdmissionLetterPdf,
  downloadCertificatePdf,
} from '../../lib/pdfGenerator';

interface Props {
  section:
    | 'students'
    | 'programmes'
    | 'cohorts'
    | 'attendance'
    | 'assignments'
    | 'assessments'
    | 'certificates';
  programmes: Programme[];
  cohorts: Cohort[];
  students: StudentProfile[];
  applications: ApplicationRecord[];
  attendance: AttendanceRecord[];
  assignments: AssignmentRecord[];
  submissions: SubmissionRecord[];
  assessments: AssessmentRecord[];
  certificates: CertificateRecord[];
  settings: InstituteSettings | null;
  prefillEnrolApp?: ApplicationRecord | null;
  onClearPrefillEnrol?: () => void;
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
}

export default function AdminAcademicsTab({
  section,
  programmes,
  cohorts,
  students,
  applications,
  attendance,
  assignments,
  submissions,
  assessments,
  certificates,
  settings,
  prefillEnrolApp,
  onClearPrefillEnrol,
  apiFetch,
  onRefresh,
}: Props) {
  const currency = settings?.currency || 'NGN';
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Enrol Student Form
  const [showEnrolForm, setShowEnrolForm] = useState(false);
  const [enrolAppId, setEnrolAppId] = useState('');
  const [enrolFullName, setEnrolFullName] = useState('');
  const [enrolEmail, setEnrolEmail] = useState('');
  const [enrolPhone, setEnrolPhone] = useState('');
  const [enrolProgId, setEnrolProgId] = useState('');
  const [enrolCohortId, setEnrolCohortId] = useState('');
  const [enrolPaymentPlan, setEnrolPaymentPlan] =
    useState<PaymentPlanChoice>('FULL_PAYMENT');
  const [enrolStartDate, setEnrolStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Programme Editor
  const defaultWeeksTemplate = (weeks = 3): WeeklyDeliverable[] =>
    Array.from({ length: weeks }, (_, idx) => ({
      weekNumber: idx + 1,
      title: `Week ${idx + 1} Module`,
      sessionCommitment: '3 Sessions · 9 Practical Hours',
      learn: ['Core concepts and guided walkthrough'],
      practise: ['Guided implementation exercises'],
      produce: `Week ${idx + 1} working deliverable`,
    }));

  const [editingProg, setEditingProg] = useState<Programme | null>(null);
  const [showNewProg, setShowNewProg] = useState(false);
  const [progForm, setProgForm] = useState({
    title: '',
    summary: '',
    description: '',
    durationText: '3 Weeks (27 Practical Hours)',
    durationWeeks: 3,
    sessionSchedule: '3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)',
    deliveryFormat: 'Hybrid',
    weeklyFeeAmount: 430000,
    feeAmount: 1290000,
    allowsInstalments: true,
    objectivesText: '',
    skillsText: '',
    graduationOutcomesText: '',
    weeklyDeliverables: defaultWeeksTemplate(3),
    isActive: true,
  });

  // Cohort Form
  const [cohortForm, setCohortForm] = useState({
    programmeId: '',
    name: '',
    instructorName: settings?.instructorName || 'Prince Anyanwu',
    deliveryFormat: 'Hybrid',
    scheduleText: 'Mon / Wed / Fri · 6:00 PM – 9:00 PM WAT',
    startDate: new Date().toISOString().slice(0, 10),
    capacity: 25,
  });

  // Attendance Form
  const [attProgId, setAttProgId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attTopic, setAttTopic] = useState('');
  const [attStatuses, setAttStatuses] = useState<Record<number, string>>({});

  // Assignment Form & Grading
  const [assignForm, setAssignForm] = useState({
    programmeId: '',
    cohortId: '',
    title: '',
    description: '',
    submissionRequirements: 'Submit live deployed URL or GitHub link',
    resourceUrl: '',
    resourceLabel: '',
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    maxScore: 100,
  });
  const [gradingSub, setGradingSub] = useState<SubmissionRecord | null>(null);
  const [gradeScore, setGradeScore] = useState('85');
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Assessment Form
  const [assessForm, setAssessForm] = useState({
    studentProfileId: '',
    assessmentType: 'Practical Assessment',
    title: '',
    score: '85',
    maxScore: '100',
    evaluationNotes: '',
  });

  // Certificate Issuance
  const [certStudentId, setCertStudentId] = useState('');
  const [certCompletionDate, setCertCompletionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [certIssues, setCertIssues] = useState<string[] | null>(null);

  useEffect(() => {
    if (prefillEnrolApp) {
      setShowEnrolForm(true);
      setEnrolAppId(String(prefillEnrolApp.id));
      setEnrolFullName(prefillEnrolApp.fullName);
      setEnrolEmail(prefillEnrolApp.email);
      setEnrolPhone(prefillEnrolApp.phone);
      setEnrolPaymentPlan(prefillEnrolApp.preferredPaymentPlan || 'FULL_PAYMENT');
      setEnrolProgId(
        prefillEnrolApp.programmeId
          ? String(prefillEnrolApp.programmeId)
          : String(programmes[0]?.id || '')
      );
      onClearPrefillEnrol?.();
    }
  }, [prefillEnrolApp, programmes, onClearPrefillEnrol]);

  const handleEnrol = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await apiFetch<StudentProfile>('/api/admin/students/enrol', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: enrolAppId ? Number(enrolAppId) : null,
          fullName: enrolFullName,
          email: enrolEmail,
          phone: enrolPhone,
          programmeId: Number(enrolProgId),
          cohortId: enrolCohortId ? Number(enrolCohortId) : null,
          preferredPaymentPlan: enrolPaymentPlan,
          commencementDate: enrolStartDate,
        }),
      });
      setNotice(
        `Student enrolled with Admission Number ${created.admissionNumber}.`
      );
      setShowEnrolForm(false);
      setEnrolAppId('');
      setEnrolFullName('');
      setEnrolEmail('');
      setEnrolPhone('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrolment failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: progForm.title,
        summary: progForm.summary || progForm.description.slice(0, 160),
        description: progForm.description,
        durationText: progForm.durationText,
        durationWeeks: Number(progForm.durationWeeks),
        sessionSchedule: progForm.sessionSchedule,
        deliveryFormat: progForm.deliveryFormat,
        weeklyFeeAmount: Number(progForm.weeklyFeeAmount),
        feeAmount: Number(progForm.feeAmount),
        allowsInstalments: progForm.allowsInstalments,
        isActive: progForm.isActive,
        learningObjectives: progForm.objectivesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        skillsAcquired: progForm.skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        graduationOutcomes: progForm.graduationOutcomesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        weeklyDeliverables: progForm.weeklyDeliverables.map((wk, idx) => ({
          ...wk,
          weekNumber: idx + 1,
        })),
      };
      if (editingProg) {
        await apiFetch(`/api/admin/programmes/${editingProg.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setNotice(`Programme "${progForm.title}" updated.`);
      } else {
        await apiFetch('/api/admin/programmes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setNotice(`Programme "${progForm.title}" created.`);
      }
      setEditingProg(null);
      setShowNewProg(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save programme.');
    } finally {
      setBusy(false);
    }
  };

  const toggleProgActive = async (p: Programme) => {
    try {
      await apiFetch(`/api/admin/programmes/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const createCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/admin/cohorts', {
        method: 'POST',
        body: JSON.stringify({
          ...cohortForm,
          programmeId: Number(cohortForm.programmeId),
          capacity: Number(cohortForm.capacity),
        }),
      });
      setNotice('Cohort created.');
      setCohortForm({ ...cohortForm, name: '' });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cohort.');
    } finally {
      setBusy(false);
    }
  };

  const submitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const progStudents = students.filter(
      (s) => String(s.programmeId) === attProgId
    );
    if (progStudents.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/admin/attendance', {
        method: 'POST',
        body: JSON.stringify({
          entries: progStudents.map((s) => ({
            studentProfileId: s.id,
            programmeId: s.programmeId,
            cohortId: s.cohortId,
            sessionDate: attDate,
            sessionTopic: attTopic,
            status: attStatuses[s.id] || 'PRESENT',
          })),
        }),
      });
      setNotice(`Attendance recorded for ${progStudents.length} student(s).`);
      setAttTopic('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attendance save failed.');
    } finally {
      setBusy(false);
    }
  };

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/admin/assignments', {
        method: 'POST',
        body: JSON.stringify({
          ...assignForm,
          programmeId: Number(assignForm.programmeId),
          cohortId: assignForm.cohortId ? Number(assignForm.cohortId) : null,
          maxScore: Number(assignForm.maxScore),
        }),
      });
      setNotice('Assignment published.');
      setAssignForm({ ...assignForm, title: '', description: '' });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment.');
    } finally {
      setBusy(false);
    }
  };

  const submitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSub) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/submissions/${gradingSub.id}/grade`, {
        method: 'PATCH',
        body: JSON.stringify({
          score: Number(gradeScore),
          feedback: gradeFeedback,
          status: 'REVIEWED',
        }),
      });
      setGradingSub(null);
      setNotice('Submission graded and student notified.');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed.');
    } finally {
      setBusy(false);
    }
  };

  const createAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find(
      (s) => String(s.id) === assessForm.studentProfileId
    );
    if (!stu) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/admin/assessments', {
        method: 'POST',
        body: JSON.stringify({
          studentProfileId: stu.id,
          programmeId: stu.programmeId,
          assessmentType: assessForm.assessmentType,
          title: assessForm.title,
          score: Number(assessForm.score),
          maxScore: Number(assessForm.maxScore),
          evaluationNotes: assessForm.evaluationNotes,
        }),
      });
      setNotice('Assessment evaluation recorded.');
      setAssessForm({ ...assessForm, title: '', evaluationNotes: '' });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record assessment.');
    } finally {
      setBusy(false);
    }
  };

  const issueCertificate = async (overrideChecks = false) => {
    if (!certStudentId) return;
    setBusy(true);
    setError(null);
    setCertIssues(null);
    try {
      const cert = await apiFetch<CertificateRecord>('/api/admin/certificates', {
        method: 'POST',
        body: JSON.stringify({
          studentProfileId: Number(certStudentId),
          completionDate: certCompletionDate,
          overrideChecks,
        }),
      });
      setNotice(
        `Certificate ${cert.certificateNumber} issued for ${cert.studentFullName}.`
      );
      setCertStudentId('');
      await onRefresh();
    } catch (err) {
      const e = err as Error & { code?: string; issues?: string[] };
      if (e.code === 'CERTIFICATION_REQUIREMENTS_UNMET' && e.issues) {
        setCertIssues(e.issues);
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleCertRevoke = async (cert: CertificateRecord) => {
    try {
      await apiFetch(`/api/admin/certificates/${cert.id}/revoke`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: cert.status === 'VALID' ? 'REVOKED' : 'VALID',
        }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
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

      {/* STUDENTS & ONBOARDING */}
      {section === 'students' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Students &amp; Onboarding</h2>
              <p className="text-xs text-neutral-500">
                Enrol accepted applicants, generate ARTI-STU numbers, assign
                cohorts, and issue admission letters.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEnrolForm(!showEnrolForm)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316]"
            >
              <UserPlus className="w-4 h-4" />
              Enrol Student
            </button>
          </div>

          {showEnrolForm && (
            <form
              onSubmit={handleEnrol}
              className="bg-white border border-neutral-200 p-6 space-y-4"
            >
              <h3 className="font-bold text-base border-b border-neutral-200 pb-2">
                Student Enrolment &amp; Onboarding
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Enrol from Accepted Application (Optional)
                  </label>
                  <select
                    value={enrolAppId}
                    onChange={(e) => {
                      setEnrolAppId(e.target.value);
                      const a = applications.find(
                        (ap) => String(ap.id) === e.target.value
                      );
                      if (a) {
                        setEnrolFullName(a.fullName);
                        setEnrolEmail(a.email);
                        setEnrolPhone(a.phone);
                        setEnrolPaymentPlan(
                          a.preferredPaymentPlan || 'FULL_PAYMENT'
                        );
                        if (a.programmeId) setEnrolProgId(String(a.programmeId));
                      }
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                  >
                    <option value="">Direct Student Enrolment...</option>
                    {applications
                      .filter((a) => a.status !== 'ENROLLED')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.referenceNumber} — {a.fullName} ({a.status})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={enrolFullName}
                    onChange={(e) => setEnrolFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={enrolEmail}
                    onChange={(e) => setEnrolEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={enrolPhone}
                    onChange={(e) => setEnrolPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Programme *
                  </label>
                  <select
                    required
                    value={enrolProgId}
                    onChange={(e) => setEnrolProgId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                  >
                    <option value="">Select programme...</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Assign Cohort
                  </label>
                  <select
                    value={enrolCohortId}
                    onChange={(e) => setEnrolCohortId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                  >
                    <option value="">Unassigned</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Payment Plan
                  </label>
                  <select
                    value={enrolPaymentPlan}
                    onChange={(e) =>
                      setEnrolPaymentPlan(e.target.value as PaymentPlanChoice)
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                  >
                    <option value="FULL_PAYMENT">
                      Option A — Full Payment
                    </option>
                    <option value="WEEKLY_INSTALMENTS">
                      Option B — Weekly Instalments
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Commencement Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={enrolStartDate}
                    onChange={(e) => setEnrolStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800"
                >
                  {busy ? 'Enrolling...' : 'Confirm Enrolment & Generate Admission No.'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEnrolForm(false)}
                  className="px-4 py-2.5 border border-neutral-300 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Admission No.</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Programme &amp; Cohort</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Admission Letter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-neutral-500 text-sm"
                    >
                      No enrolled students yet.
                    </td>
                  </tr>
                ) : (
                  students.map((stu) => {
                    const prog = programmes.find((p) => p.id === stu.programmeId);
                    const coh = cohorts.find((c) => c.id === stu.cohortId);
                    return (
                      <tr key={stu.id}>
                        <td className="py-3 px-4 font-mono text-xs font-bold text-[#F9501E] whitespace-nowrap">
                          {stu.admissionNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">{stu.fullName}</div>
                          <div className="text-xs text-neutral-500">
                            {stu.email} · {stu.phone}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="font-medium">
                            {prog?.title || `Programme #${stu.programmeId}`}
                          </div>
                          <div className="text-neutral-500">
                            {coh ? coh.name : 'No cohort assigned'} ·{' '}
                            <span className="font-mono text-[#111111]">
                              {stu.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
                                ? 'Weekly Instalments'
                                : 'Full Payment'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs tabular-nums">
                          {stu.commencementDate}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold">
                          {stu.academicStatus}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              downloadAdmissionLetterPdf(
                                stu,
                                prog,
                                coh,
                                settings
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-neutral-300 text-xs hover:bg-neutral-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Letter PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROGRAMMES */}
      {section === 'programmes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Programme Management</h2>
              <p className="text-xs text-neutral-500">
                Create, edit, activate/deactivate programmes, and update live
                tuition fees.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingProg(null);
                setProgForm({
                  title: '',
                  summary: '',
                  description: '',
                  durationText: '3 Weeks (27 Practical Hours)',
                  durationWeeks: 3,
                  sessionSchedule:
                    '3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)',
                  deliveryFormat: 'Hybrid',
                  weeklyFeeAmount: 430000,
                  feeAmount: 1290000,
                  allowsInstalments: true,
                  objectivesText: '',
                  skillsText: '',
                  graduationOutcomesText: '',
                  weeklyDeliverables: defaultWeeksTemplate(3),
                  isActive: true,
                });
                setShowNewProg(!showNewProg);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#F9501E] text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Create Programme
            </button>
          </div>

          {(showNewProg || editingProg) && (
            <form
              onSubmit={saveProgramme}
              className="bg-white border border-neutral-200 p-6 space-y-5"
            >
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                <h3 className="font-bold">
                  {editingProg ? `Edit ${editingProg.title}` : 'New Programme'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProg(null);
                    setShowNewProg(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-medium mb-1">
                    Programme Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={progForm.title}
                    onChange={(e) =>
                      setProgForm({ ...progForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Weekly Tuition Fee ({currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={progForm.weeklyFeeAmount}
                    onChange={(e) => {
                      const wk = Number(e.target.value);
                      setProgForm({
                        ...progForm,
                        weeklyFeeAmount: wk,
                        feeAmount: wk * progForm.durationWeeks,
                      });
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Duration (Weeks) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={52}
                    value={progForm.durationWeeks}
                    onChange={(e) => {
                      const wks = Math.max(1, Number(e.target.value));
                      setProgForm({
                        ...progForm,
                        durationWeeks: wks,
                        feeAmount: progForm.weeklyFeeAmount * wks,
                      });
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Total Programme Investment ({currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={progForm.feeAmount}
                    onChange={(e) =>
                      setProgForm({
                        ...progForm,
                        feeAmount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Duration Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={progForm.durationText}
                    onChange={(e) =>
                      setProgForm({ ...progForm, durationText: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Delivery Format *
                  </label>
                  <select
                    value={progForm.deliveryFormat}
                    onChange={(e) =>
                      setProgForm({
                        ...progForm,
                        deliveryFormat: e.target.value,
                      })
                    }
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Weekly Session Schedule
                  </label>
                  <input
                    type="text"
                    value={progForm.sessionSchedule}
                    onChange={(e) =>
                      setProgForm({
                        ...progForm,
                        sessionSchedule: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2.5 text-xs font-medium py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={progForm.allowsInstalments}
                    onChange={(e) =>
                      setProgForm({
                        ...progForm,
                        allowsInstalments: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#F9501E]"
                  />
                  Enable Option B — Weekly Instalments Plan for this programme
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={progForm.description}
                  onChange={(e) =>
                    setProgForm({ ...progForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Learning Objectives (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={progForm.objectivesText}
                    onChange={(e) =>
                      setProgForm({
                        ...progForm,
                        objectivesText: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Skills Acquired (comma-separated)
                  </label>
                  <textarea
                    rows={3}
                    value={progForm.skillsText}
                    onChange={(e) =>
                      setProgForm({ ...progForm, skillsText: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Graduation Outcomes (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={progForm.graduationOutcomesText}
                    onChange={(e) =>
                      setProgForm({
                        ...progForm,
                        graduationOutcomesText: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 text-sm"
                  />
                </div>
              </div>

              {/* Weekly Deliverables Editor */}
              <div className="border-t border-neutral-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#111111]">
                    Configurable Weekly Deliverables (Learn / Practise / Produce)
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setProgForm({
                        ...progForm,
                        weeklyDeliverables: [
                          ...progForm.weeklyDeliverables,
                          {
                            weekNumber: progForm.weeklyDeliverables.length + 1,
                            title: `Week ${progForm.weeklyDeliverables.length + 1} Module`,
                            sessionCommitment: '3 Sessions · 9 Practical Hours',
                            learn: [''],
                            practise: [''],
                            produce: '',
                          },
                        ],
                      })
                    }
                    className="px-3 py-1 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
                  >
                    + Add Week
                  </button>
                </div>

                <div className="space-y-3">
                  {progForm.weeklyDeliverables.map((wk, wIdx) => (
                    <div
                      key={wIdx}
                      className="border border-neutral-200 p-4 bg-[#F9F8F6] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-bold text-[#F9501E]">
                          WEEK {wIdx + 1}
                        </span>
                        {progForm.weeklyDeliverables.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setProgForm({
                                ...progForm,
                                weeklyDeliverables:
                                  progForm.weeklyDeliverables.filter(
                                    (_, i) => i !== wIdx
                                  ),
                              })
                            }
                            className="text-xs text-red-700 hover:underline"
                          >
                            Remove Week
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={wk.title}
                          onChange={(e) => {
                            const next = [...progForm.weeklyDeliverables];
                            next[wIdx] = { ...wk, title: e.target.value };
                            setProgForm({
                              ...progForm,
                              weeklyDeliverables: next,
                            });
                          }}
                          placeholder="Week Title"
                          className="w-full px-3 py-1.5 border border-neutral-300 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={wk.sessionCommitment}
                          onChange={(e) => {
                            const next = [...progForm.weeklyDeliverables];
                            next[wIdx] = {
                              ...wk,
                              sessionCommitment: e.target.value,
                            };
                            setProgForm({
                              ...progForm,
                              weeklyDeliverables: next,
                            });
                          }}
                          placeholder="Session Commitment"
                          className="w-full px-3 py-1.5 border border-neutral-300 text-xs bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-neutral-500 mb-1">
                            Learn (1 per line)
                          </label>
                          <textarea
                            rows={2}
                            value={wk.learn.join('\n')}
                            onChange={(e) => {
                              const next = [...progForm.weeklyDeliverables];
                              next[wIdx] = {
                                ...wk,
                                learn: e.target.value.split('\n'),
                              };
                              setProgForm({
                                ...progForm,
                                weeklyDeliverables: next,
                              });
                            }}
                            className="w-full px-2.5 py-1.5 border border-neutral-300 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-500 mb-1">
                            Practise (1 per line)
                          </label>
                          <textarea
                            rows={2}
                            value={wk.practise.join('\n')}
                            onChange={(e) => {
                              const next = [...progForm.weeklyDeliverables];
                              next[wIdx] = {
                                ...wk,
                                practise: e.target.value.split('\n'),
                              };
                              setProgForm({
                                ...progForm,
                                weeklyDeliverables: next,
                              });
                            }}
                            className="w-full px-2.5 py-1.5 border border-neutral-300 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-500 mb-1">
                            Produce (Weekly Deliverable)
                          </label>
                          <textarea
                            rows={2}
                            value={wk.produce}
                            onChange={(e) => {
                              const next = [...progForm.weeklyDeliverables];
                              next[wIdx] = { ...wk, produce: e.target.value };
                              setProgForm({
                                ...progForm,
                                weeklyDeliverables: next,
                              });
                            }}
                            className="w-full px-2.5 py-1.5 border border-neutral-300 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold"
              >
                {busy ? 'Saving...' : 'Save Programme'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programmes.map((p) => {
              const wkFee =
                p.weeklyFeeAmount ??
                Math.round(p.feeAmount / Math.max(1, p.durationWeeks || 3));
              const wks = p.durationWeeks || 3;
              return (
                <div
                  key={p.id}
                  className="bg-white border border-neutral-200 p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#F9501E] font-bold">{p.code}</span>
                      <span
                        className={
                          p.isActive ? 'text-emerald-700' : 'text-neutral-400'
                        }
                      >
                        {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <h3 className="font-bold text-base mt-1">{p.title}</h3>
                    <p className="text-xs text-neutral-600 mt-1">
                      {p.description}
                    </p>
                  </div>
                  <div className="space-y-3 border-t border-neutral-200 pt-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-mono font-bold text-sm tabular-nums">
                        {currency} {wkFee.toLocaleString()}/wk × {wks} wks ={' '}
                        {currency} {p.feeAmount.toLocaleString()}
                      </div>
                      <span className="font-mono text-[11px] text-neutral-500">
                        {p.allowsInstalments ? 'Instalments Enabled' : 'Full Only'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-neutral-500">
                        {p.durationText} ·{' '}
                        {Array.isArray(p.weeklyDeliverables)
                          ? p.weeklyDeliverables.length
                          : 0}{' '}
                        weekly specs
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewProg(false);
                            setEditingProg(p);
                            setProgForm({
                              title: p.title,
                              summary: p.summary,
                              description: p.description,
                              durationText: p.durationText,
                              durationWeeks: p.durationWeeks || 3,
                              sessionSchedule:
                                p.sessionSchedule ||
                                '3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)',
                              deliveryFormat: p.deliveryFormat,
                              weeklyFeeAmount: wkFee,
                              feeAmount: p.feeAmount,
                              allowsInstalments: p.allowsInstalments !== false,
                              objectivesText: p.learningObjectives.join('\n'),
                              skillsText: p.skillsAcquired.join(', '),
                              graduationOutcomesText: (
                                p.graduationOutcomes || []
                              ).join('\n'),
                              weeklyDeliverables:
                                Array.isArray(p.weeklyDeliverables) &&
                                p.weeklyDeliverables.length > 0
                                  ? p.weeklyDeliverables
                                  : defaultWeeksTemplate(p.durationWeeks || 3),
                              isActive: p.isActive,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-neutral-300 text-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleProgActive(p)}
                          className="px-2.5 py-1.5 border border-neutral-300 text-xs"
                        >
                          {p.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COHORTS */}
      {section === 'cohorts' && (
        <div className="space-y-6">
          <form
            onSubmit={createCohort}
            className="bg-white border border-neutral-200 p-6 space-y-4"
          >
            <h2 className="text-lg font-bold">Create Training Cohort</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Programme *
                </label>
                <select
                  required
                  value={cohortForm.programmeId}
                  onChange={(e) =>
                    setCohortForm({ ...cohortForm, programmeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="">Select programme...</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Cohort Name *
                </label>
                <input
                  type="text"
                  required
                  value={cohortForm.name}
                  onChange={(e) =>
                    setCohortForm({ ...cohortForm, name: e.target.value })
                  }
                  placeholder="e.g. January 2027 Batch A"
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Instructor *
                </label>
                <input
                  type="text"
                  required
                  value={cohortForm.instructorName}
                  onChange={(e) =>
                    setCohortForm({
                      ...cohortForm,
                      instructorName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Schedule *
                </label>
                <input
                  type="text"
                  required
                  value={cohortForm.scheduleText}
                  onChange={(e) =>
                    setCohortForm({
                      ...cohortForm,
                      scheduleText: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={cohortForm.startDate}
                  onChange={(e) =>
                    setCohortForm({ ...cohortForm, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  value={cohortForm.capacity}
                  onChange={(e) =>
                    setCohortForm({
                      ...cohortForm,
                      capacity: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold"
            >
              Create Cohort
            </button>
          </form>

          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Cohort</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Start</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {cohorts.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-[#F9501E]">
                      {c.code}
                    </td>
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4 text-xs">{c.scheduleText}</td>
                    <td className="py-3 px-4 text-xs">{c.instructorName}</td>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums">
                      {c.startDate}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold">
                      {c.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ATTENDANCE */}
      {section === 'attendance' && (
        <div className="space-y-6">
          <form
            onSubmit={submitAttendance}
            className="bg-white border border-neutral-200 p-6 space-y-4"
          >
            <h2 className="text-lg font-bold">Session Attendance Register</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Programme *
                </label>
                <select
                  required
                  value={attProgId}
                  onChange={(e) => setAttProgId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="">Select programme...</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Session Date *
                </label>
                <input
                  type="date"
                  required
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Session Topic
                </label>
                <input
                  type="text"
                  value={attTopic}
                  onChange={(e) => setAttTopic(e.target.value)}
                  placeholder="e.g. Week 2 Database Wiring"
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
            </div>

            {attProgId && (
              <div className="border border-neutral-200 divide-y divide-neutral-200">
                {students.filter((s) => String(s.programmeId) === attProgId)
                  .length === 0 ? (
                  <div className="p-4 text-xs text-neutral-500">
                    No enrolled students in this programme yet.
                  </div>
                ) : (
                  students
                    .filter((s) => String(s.programmeId) === attProgId)
                    .map((stu) => (
                      <div
                        key={stu.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                      >
                        <div>
                          <span className="font-mono text-xs text-[#F9501E] mr-2">
                            {stu.admissionNumber}
                          </span>
                          <span className="font-medium">{stu.fullName}</span>
                        </div>
                        <select
                          value={attStatuses[stu.id] || 'PRESENT'}
                          onChange={(e) =>
                            setAttStatuses({
                              ...attStatuses,
                              [stu.id]: e.target.value,
                            })
                          }
                          className="px-3 py-1.5 border border-neutral-300 text-xs bg-white font-mono"
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="LATE">LATE</option>
                          <option value="ABSENT">ABSENT</option>
                          <option value="EXCUSED">EXCUSED</option>
                        </select>
                      </div>
                    ))
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !attProgId}
              className="px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold disabled:opacity-50"
            >
              Save Attendance Register
            </button>
          </form>

          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <div className="p-4 border-b border-neutral-200 font-bold text-sm">
              Student Attendance Percentages
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-2.5 px-4">Admission No.</th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4 text-right">Sessions Logged</th>
                  <th className="py-2.5 px-4 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {students.map((stu) => {
                  const stuAtt = attendance.filter(
                    (a) => a.studentProfileId === stu.id
                  );
                  const attended = stuAtt.filter(
                    (a) => a.status === 'PRESENT' || a.status === 'LATE'
                  ).length;
                  const pct =
                    stuAtt.length > 0
                      ? Math.round((attended / stuAtt.length) * 100)
                      : 0;
                  return (
                    <tr key={stu.id}>
                      <td className="py-2.5 px-4 font-mono text-xs text-[#F9501E]">
                        {stu.admissionNumber}
                      </td>
                      <td className="py-2.5 px-4 font-medium">{stu.fullName}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums">
                        {attended} / {stuAtt.length}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold tabular-nums">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSIGNMENTS */}
      {section === 'assignments' && (
        <div className="space-y-6">
          <form
            onSubmit={createAssignment}
            className="bg-white border border-neutral-200 p-6 space-y-4"
          >
            <h2 className="text-lg font-bold">Publish Assignment &amp; Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Programme *
                </label>
                <select
                  required
                  value={assignForm.programmeId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, programmeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="">Select programme...</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  value={assignForm.title}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Deadline *
                </label>
                <input
                  type="date"
                  required
                  value={assignForm.deadline}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, deadline: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Resource Link (Optional)
                </label>
                <input
                  type="url"
                  value={assignForm.resourceUrl}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, resourceUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Instructions &amp; Brief *
              </label>
              <textarea
                rows={2}
                required
                value={assignForm.description}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold"
            >
              Publish Assignment
            </button>
          </form>

          {/* Submissions Review */}
          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <div className="p-4 border-b border-neutral-200 font-bold text-sm">
              Student Submissions ({submissions.length})
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Assignment</th>
                  <th className="py-2.5 px-4">Submission URL</th>
                  <th className="py-2.5 px-4">Score</th>
                  <th className="py-2.5 px-4 text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {submissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-neutral-500 text-xs"
                    >
                      No student submissions yet.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => {
                    const stu = students.find(
                      (s) => s.id === sub.studentProfileId
                    );
                    const assign = assignments.find(
                      (a) => a.id === sub.assignmentId
                    );
                    return (
                      <tr key={sub.id}>
                        <td className="py-2.5 px-4 text-xs font-medium">
                          {stu?.fullName || `Student #${sub.studentProfileId}`}
                        </td>
                        <td className="py-2.5 px-4 text-xs">
                          {assign?.title || `Assignment #${sub.assignmentId}`}
                        </td>
                        <td className="py-2.5 px-4 text-xs">
                          <a
                            href={sub.submissionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline font-mono text-[#F9501E]"
                          >
                            Open Link
                          </a>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs tabular-nums">
                          {sub.score !== null ? `${sub.score}` : 'Pending'}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setGradingSub(sub);
                              setGradeScore(String(sub.score ?? 85));
                              setGradeFeedback(sub.feedback || '');
                            }}
                            className="px-3 py-1 border border-neutral-300 text-xs"
                          >
                            Review &amp; Score
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {gradingSub && (
            <form
              onSubmit={submitGrade}
              className="bg-white border border-neutral-200 p-5 space-y-3 max-w-lg"
            >
              <h3 className="font-bold text-sm">Grade Submission</h3>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={gradeScore}
                onChange={(e) => setGradeScore(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono"
              />
              <textarea
                rows={2}
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder="Constructive feedback..."
                className="w-full px-3 py-2 border border-neutral-300 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#F9501E] text-white text-xs font-semibold"
                >
                  Save Grade
                </button>
                <button
                  type="button"
                  onClick={() => setGradingSub(null)}
                  className="px-4 py-2 border border-neutral-300 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ASSESSMENTS */}
      {section === 'assessments' && (
        <div className="space-y-6">
          <form
            onSubmit={createAssessment}
            className="bg-white border border-neutral-200 p-6 space-y-4"
          >
            <h2 className="text-lg font-bold">
              Record Practical &amp; Project Assessments
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Student *</label>
                <select
                  required
                  value={assessForm.studentProfileId}
                  onChange={(e) =>
                    setAssessForm({
                      ...assessForm,
                      studentProfileId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.admissionNumber} — {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Assessment Type *
                </label>
                <select
                  value={assessForm.assessmentType}
                  onChange={(e) =>
                    setAssessForm({
                      ...assessForm,
                      assessmentType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="Practical Assessment">
                    Practical Assessment
                  </option>
                  <option value="Technical Exercise">Technical Exercise</option>
                  <option value="Project Assessment">Project Assessment</option>
                  <option value="Instructor Evaluation">
                    Instructor Evaluation
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={assessForm.title}
                  onChange={(e) =>
                    setAssessForm({ ...assessForm, title: e.target.value })
                  }
                  placeholder="e.g. Week 3 Live Product Deployment"
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Score *</label>
                <input
                  type="number"
                  required
                  value={assessForm.score}
                  onChange={(e) =>
                    setAssessForm({ ...assessForm, score: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Max Score
                </label>
                <input
                  type="number"
                  required
                  value={assessForm.maxScore}
                  onChange={(e) =>
                    setAssessForm({ ...assessForm, maxScore: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={assessForm.evaluationNotes}
                  onChange={(e) =>
                    setAssessForm({
                      ...assessForm,
                      evaluationNotes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold"
            >
              Save Assessment Score
            </button>
          </form>

          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4">Evaluation Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {assessments.map((as) => {
                  const stu = students.find(
                    (s) => s.id === as.studentProfileId
                  );
                  return (
                    <tr key={as.id}>
                      <td className="py-3 px-4 text-xs font-semibold">
                        {stu?.fullName || `Student #${as.studentProfileId}`}
                      </td>
                      <td className="py-3 px-4 text-xs">{as.assessmentType}</td>
                      <td className="py-3 px-4 text-xs font-medium">
                        {as.title}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-bold tabular-nums">
                        {as.score} / {as.maxScore}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600">
                        {as.evaluationNotes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CERTIFICATES */}
      {section === 'certificates' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 p-6 space-y-4">
            <h2 className="text-lg font-bold">
              Approve &amp; Issue Institutional Certificates
            </h2>
            <p className="text-xs text-neutral-600">
              System automatically verifies student attendance, assessment
              records, and invoice clearance before generating an official
              ARTI-CERT credential.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Graduating Student *
                </label>
                <select
                  value={certStudentId}
                  onChange={(e) => {
                    setCertStudentId(e.target.value);
                    setCertIssues(null);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                >
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.admissionNumber} — {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Completion Date *
                </label>
                <input
                  type="date"
                  value={certCompletionDate}
                  onChange={(e) => setCertCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={busy || !certStudentId}
                onClick={() => issueCertificate(false)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316] disabled:opacity-50"
              >
                <Award className="w-4 h-4" />
                Approve &amp; Issue Certificate
              </button>
            </div>

            {certIssues && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="font-bold">
                  Academic / Financial Clearance Check Flagged:
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  {certIssues.map((iss, idx) => (
                    <li key={idx}>{iss}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => issueCertificate(true)}
                  className="px-4 py-2 bg-[#111111] text-white text-xs font-semibold mt-2"
                >
                  Confirm Administrative Override &amp; Issue Anyway
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-neutral-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Certificate No.</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Programme</th>
                  <th className="py-3 px-4">Verify Code</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {certificates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-neutral-500 text-sm"
                    >
                      No certificates issued yet.
                    </td>
                  </tr>
                ) : (
                  certificates.map((cert) => (
                    <tr key={cert.id}>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-[#F9501E]">
                        {cert.certificateNumber}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {cert.studentFullName}
                      </td>
                      <td className="py-3 px-4 text-xs">{cert.programmeTitle}</td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {cert.verificationCode}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold">
                        <span
                          className={
                            cert.status === 'VALID'
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }
                        >
                          {cert.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => downloadCertificatePdf(cert, settings)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#111111] text-white text-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCertRevoke(cert)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-neutral-300 text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {cert.status === 'VALID' ? 'Revoke' : 'Reinstate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
