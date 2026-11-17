import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { InstituteSettings, PaymentPlanChoice, Programme } from '../types';
import { apiUrl } from '../lib/api';

interface Props {
  programmes: Programme[];
  settings?: InstituteSettings | null;
  initialProgrammeId?: number | null;
  onSubmitted?: (result: {
    referenceNumber: string;
    programmeName: string;
    preferredPaymentPlan?: string;
    status: string;
    submittedDate: string;
  }) => void;
  onBackToSite?: () => void;
  onContinueToPortal?: () => void;
}

const EXPERIENCE_OPTIONS = [
  'No previous experience',
  'Basic computer literacy',
  'Website development',
  'Mobile app development',
  'Programming',
  'AI tools and automation',
  'Other',
];

const DEVICE_OPTIONS = [
  'Windows laptop',
  'MacBook',
  'Desktop computer',
  'Android phone',
  'iPhone',
  'Tablet',
];

const TOOLS_LIST = [
  'VS Code',
  'GitHub',
  'ChatGPT',
  'Google AI Studio',
  'APIs',
  'Databases',
  'Cloud deployment',
];

const SKILL_LEVELS = ['Never used', 'Beginner', 'Intermediate', 'Advanced'];

const DRAFT_STORAGE_KEY = 'artdrobotix_application_draft_v1';

export default function ApplicationForm({
  programmes,
  settings,
  initialProgrammeId,
  onSubmitted,
  onBackToSite,
  onContinueToPortal,
}: Props) {
  const defaultProg =
    programmes.find((p) => p.id === initialProgrammeId) || programmes[0];
  const currency = settings?.currency || 'NGN';

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceNumber: string;
    programmeName: string;
    preferredPaymentPlan?: string;
    status: string;
    submittedDate: string;
  } | null>(null);

interface ApplicationDraftForm {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  stateCity: string;
  residentialAddress: string;
  phone: string;
  email: string;
  gender: string;
  highestQualification: string;
  institutionAttended: string;
  professionalStatus: string;
  occupationIndustry: string;
  previousExperience: string[];
  availableDevices: string[];
  internetAccess: string;
  toolFamiliarity: Record<string, string>;
  preferredSetup: string;
  programmeId: string;
  programmeName: string;
  preferredFormat: string;
  preferredPaymentPlan: PaymentPlanChoice;
  learningObjectives: string;
  projectIdea: string;
  expectedOutcome: string;
  availability: string;
  canCompleteAssignments: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  sponsorName: string;
  sponsorDetails: string;
  consentAccuracy: boolean;
  consentPrivacy: boolean;
  consentMedia: boolean;
  signatureName: string;
  guardianSignature: string;
}

  const [form, setForm] = useState<ApplicationDraftForm>(() => {
    const base: ApplicationDraftForm = {
      fullName: '',
      dateOfBirth: '',
      nationality: 'Nigerian',
      stateCity: '',
      residentialAddress: '',
      phone: '',
      email: '',
      gender: '',
      highestQualification: '',
      institutionAttended: '',
      professionalStatus: 'Student',
      occupationIndustry: '',
      previousExperience: [],
      availableDevices: [],
      internetAccess: 'Reliable broadband',
      toolFamiliarity: TOOLS_LIST.reduce(
        (acc, tool) => ({ ...acc, [tool]: 'Never used' }),
        {} as Record<string, string>
      ),
      preferredSetup: 'Laptop-based development',
      programmeId: defaultProg ? String(defaultProg.id) : '',
      programmeName: defaultProg ? defaultProg.title : 'AI Application Development',
      preferredFormat: 'Hybrid',
      preferredPaymentPlan: 'FULL_PAYMENT',
      learningObjectives: '',
      projectIdea: '',
      expectedOutcome: '',
      availability: '',
      canCompleteAssignments: 'Yes',
      emergencyContactName: '',
      emergencyContactPhone: '',
      sponsorName: '',
      sponsorDetails: '',
      consentAccuracy: false,
      consentPrivacy: false,
      consentMedia: false,
      signatureName: '',
      guardianSignature: '',
    };
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ApplicationDraftForm>;
        return {
          ...base,
          ...parsed,
          programmeId: defaultProg ? String(defaultProg.id) : parsed.programmeId || base.programmeId,
          programmeName: defaultProg ? defaultProg.title : parsed.programmeName || base.programmeName,
        };
      }
    } catch {
      // ignore storage errors
    }
    return base;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore storage quota
    }
  }, [form]);

  useEffect(() => {
    if (initialProgrammeId) {
      const target = programmes.find((p) => p.id === initialProgrammeId);
      if (target) {
        setForm((prev) => ({
          ...prev,
          programmeId: String(target.id),
          programmeName: target.title,
        }));
      }
    }
  }, [initialProgrammeId, programmes]);

  const selectedProgramme =
    programmes.find((p) => String(p.id) === form.programmeId) ||
    defaultProg ||
    programmes[0] ||
    null;

  const toggleMulti = (field: 'previousExperience' | 'availableDevices', val: string) => {
    setForm((prev) => {
      const exists = prev[field].includes(val);
      return {
        ...prev,
        [field]: exists
          ? prev[field].filter((x) => x !== val)
          : [...prev[field], val],
      };
    });
  };

  const validateStep = (targetStep: number): string | null => {
    if (targetStep === 1) {
      if (
        !form.fullName.trim() ||
        !form.dateOfBirth ||
        !form.nationality.trim() ||
        !form.stateCity.trim() ||
        !form.residentialAddress.trim() ||
        !form.phone.trim() ||
        !form.email.trim()
      ) {
        return 'Please complete all required personal information fields.';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return 'Please enter a valid email address.';
      }
    }
    if (targetStep === 2) {
      if (!form.highestQualification.trim()) {
        return 'Please provide your highest educational qualification.';
      }
      if (form.availableDevices.length === 0) {
        return 'Please select at least one device available to you.';
      }
    }
    if (targetStep === 3) {
      if (
        !form.programmeName.trim() ||
        !form.learningObjectives.trim() ||
        !form.expectedOutcome.trim() ||
        !form.availability.trim()
      ) {
        return 'Please complete your training programme, objectives, expected outcome, and availability.';
      }
    }
    if (targetStep === 4) {
      if (
        !form.emergencyContactName.trim() ||
        !form.emergencyContactPhone.trim() ||
        !form.signatureName.trim()
      ) {
        return 'Please complete emergency contact details and your full name signature.';
      }
      if (!form.consentAccuracy || !form.consentPrivacy) {
        return 'Please accept the required accuracy declaration and privacy notice.';
      }
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(4, s + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(4);
    if (err) {
      setError(err);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const abortCtl = new AbortController();
      setTimeout(() => abortCtl.abort(), 25000);
      const res = await fetch(apiUrl('/api/public/applications'), {
        signal: abortCtl.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          programmeId: form.programmeId ? Number(form.programmeId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed.');
      }
      setConfirmation(data);
      try {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      onSubmitted?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-neutral-200 p-8 md:p-10">
        <div className="flex items-center gap-3 text-[#16A34A] mb-4">
          <CheckCircle2 className="w-7 h-7 shrink-0" />
          <h2 className="text-2xl font-bold text-[#111111]">
            Application Submitted Successfully
          </h2>
        </div>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Thank you for applying to Artdrobotix Institute. Your application has been
          recorded for admissions review. No upfront payment is required prior to
          administrative review.
        </p>

        <div className="bg-[#F9F8F6] border border-neutral-200 p-5 space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Application Reference</span>
            <span className="font-mono font-semibold text-[#F9501E] tabular-nums">
              {confirmation.referenceNumber}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Selected Programme</span>
            <span className="font-semibold text-[#111111]">
              {confirmation.programmeName}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Preferred Payment Plan</span>
            <span className="font-mono text-xs font-semibold text-[#111111]">
              {confirmation.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
                ? 'Option B — Weekly Instalments'
                : 'Option A — Full Payment'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Current Status</span>
            <span className="font-mono text-xs font-semibold text-[#111111]">
              {confirmation.status}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Date Submitted</span>
            <span className="font-mono text-xs tabular-nums text-[#111111]">
              {confirmation.submittedDate}
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
          Save your reference number ({confirmation.referenceNumber}). You can check
          your application status anytime on the public site using your reference
          number and email address.
        </p>

        <div className="flex flex-wrap gap-3">
        {onContinueToPortal && (
          <button
            type="button"
            onClick={onContinueToPortal}
            className="px-5 py-2.5 bg-[#F9501E] text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            Continue to Digital Campus
          </button>
        )}
          {onBackToSite && (
            <button
              type="button"
              onClick={onBackToSite}
              className="px-5 py-2.5 bg-[#111111] text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Return to Institute Home
            </button>
          )}
        </div>
      </div>
    );
  }

  const weeklyFee = selectedProgramme?.weeklyFeeAmount ?? 430000;
  const totalWeeks = selectedProgramme?.durationWeeks ?? 3;
  const totalFee = selectedProgramme?.feeAmount ?? weeklyFee * totalWeeks;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: 4-Step Application Wizard */}
      <div className="lg:col-span-7 bg-white border border-neutral-200">
        {/* Header Banner */}
        <div className="border-b border-neutral-200 px-6 py-6 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#111111] text-white">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#F9501E]">
              ARTDROBOTIX INSTITUTE
            </p>
            <h2 className="text-xl md:text-2xl font-bold mt-1">
              Professional Training Application
            </h2>
            <p className="text-xs text-neutral-300 mt-1">
              Step {step} of 4 · Draft saved locally · Review precedes invoicing
            </p>
          </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => {
                if (num < step) setStep(num);
              }}
              className={`w-9 h-9 text-xs font-mono font-semibold border transition-colors ${
                step === num
                  ? 'bg-[#F9501E] border-[#F9501E] text-white'
                  : num < step
                    ? 'bg-neutral-800 border-neutral-700 text-white'
                    : 'bg-transparent border-neutral-700 text-neutral-400'
              }`}
            >
              0{num}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        {error && (
          <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-[#111111] border-b border-neutral-200 pb-2">
              1. Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Full legal name (surname, first name and middle name) *
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                  placeholder="e.g. Adebayo Chinedu Musa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Date of birth *
                </label>
                <input
                  type="date"
                  required
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Nationality *
                </label>
                <input
                  type="text"
                  required
                  value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  State and city of residence *
                </label>
                <input
                  type="text"
                  required
                  value={form.stateCity}
                  onChange={(e) => setForm({ ...form, stateCity: e.target.value })}
                  placeholder="e.g. Lagos, Ikeja"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Gender (optional)
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#F9501E]"
                >
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Residential address *
                </label>
                <input
                  type="text"
                  required
                  value={form.residentialAddress}
                  onChange={(e) =>
                    setForm({ ...form, residentialAddress: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Primary phone number (WhatsApp-enabled) *
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 0801 234 5678"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Email address *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#111111] border-b border-neutral-200 pb-2">
              2. Educational Background &amp; Technical Readiness
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Highest educational qualification *
                </label>
                <input
                  type="text"
                  required
                  value={form.highestQualification}
                  onChange={(e) =>
                    setForm({ ...form, highestQualification: e.target.value })
                  }
                  placeholder="e.g. B.Sc, HND, SSCE, M.Sc"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Institution attended (where applicable)
                </label>
                <input
                  type="text"
                  value={form.institutionAttended}
                  onChange={(e) =>
                    setForm({ ...form, institutionAttended: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Current professional status *
                </label>
                <select
                  value={form.professionalStatus}
                  onChange={(e) =>
                    setForm({ ...form, professionalStatus: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#F9501E]"
                >
                  {[
                    'Student',
                    'Employed',
                    'Self-employed',
                    'Business owner',
                    'Freelancer',
                    'Unemployed',
                    'Other',
                  ].map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Current occupation / industry
                </label>
                <input
                  type="text"
                  value={form.occupationIndustry}
                  onChange={(e) =>
                    setForm({ ...form, occupationIndustry: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-2">
                Previous technical experience
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {EXPERIENCE_OPTIONS.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-2 text-sm text-neutral-800 p-2 border border-neutral-200 cursor-pointer hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.previousExperience.includes(item)}
                      onChange={() => toggleMulti('previousExperience', item)}
                      className="accent-[#F9501E] w-4 h-4"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-2">
                Devices available to you *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {DEVICE_OPTIONS.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-2 text-sm text-neutral-800 p-2 border border-neutral-200 cursor-pointer hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.availableDevices.includes(item)}
                      onChange={() => toggleMulti('availableDevices', item)}
                      className="accent-[#F9501E] w-4 h-4"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Internet access *
                </label>
                <select
                  value={form.internetAccess}
                  onChange={(e) =>
                    setForm({ ...form, internetAccess: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#F9501E]"
                >
                  <option value="Reliable broadband">Reliable broadband</option>
                  <option value="Mobile data">Mobile data</option>
                  <option value="Limited / intermittent access">
                    Limited / intermittent access
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Preferred learning setup *
                </label>
                <select
                  value={form.preferredSetup}
                  onChange={(e) =>
                    setForm({ ...form, preferredSetup: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#F9501E]"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-2">
                Familiarity with technical tools
              </label>
              <div className="overflow-x-auto border border-neutral-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-100 text-xs font-semibold text-[#111111]">
                    <tr>
                      <th className="px-3 py-2.5">Tool</th>
                      {SKILL_LEVELS.map((lvl) => (
                        <th key={lvl} className="px-3 py-2.5 text-center">
                          {lvl}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {TOOLS_LIST.map((tool) => (
                      <tr key={tool}>
                        <td className="px-3 py-2 font-medium text-[#111111]">
                          {tool}
                        </td>
                        {SKILL_LEVELS.map((lvl) => (
                          <td key={lvl} className="px-3 py-2 text-center">
                            <input
                              type="radio"
                              name={`tool-${tool}`}
                              checked={form.toolFamiliarity[tool] === lvl}
                              onChange={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  toolFamiliarity: {
                                    ...prev.toolFamiliarity,
                                    [tool]: lvl,
                                  },
                                }))
                              }
                              className="accent-[#F9501E] w-4 h-4 cursor-pointer"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-[#111111] border-b border-neutral-200 pb-2">
              3. Training Programme &amp; Objectives
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Programme of interest *
                </label>
                <select
                  value={form.programmeId}
                  onChange={(e) => {
                    const selected = programmes.find(
                      (p) => String(p.id) === e.target.value
                    );
                    setForm({
                      ...form,
                      programmeId: e.target.value,
                      programmeName: selected ? selected.title : form.programmeName,
                      preferredPaymentPlan:
                        selected && !selected.allowsInstalments
                          ? 'FULL_PAYMENT'
                          : form.preferredPaymentPlan,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#F9501E]"
                >
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.durationText})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Preferred training format *
                </label>
                <select
                  value={form.preferredFormat}
                  onChange={(e) =>
                    setForm({ ...form, preferredFormat: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#F9501E]"
                >
                  <option value="In-person">In-person</option>
                  <option value="Online live sessions">Online live sessions</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            {/* Preferred Payment Plan Selector */}
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-2">
                Preferred tuition payment plan *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, preferredPaymentPlan: 'FULL_PAYMENT' })
                  }
                  className={`p-4 border text-left transition-colors ${
                    form.preferredPaymentPlan === 'FULL_PAYMENT'
                      ? 'border-[#F9501E] bg-[#F9F8F6]'
                      : 'border-neutral-300 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="text-[11px] font-mono font-semibold text-[#F9501E]">
                    OPTION A · FULL PAYMENT
                  </div>
                  <div className="font-mono font-bold text-base text-[#111111] mt-1 tabular-nums">
                    {currency} {totalFee.toLocaleString()}
                  </div>
                  <div className="text-xs text-neutral-600 mt-1">
                    Single upfront settlement prior to commencement.
                  </div>
                </button>

                {selectedProgramme?.allowsInstalments !== false && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        preferredPaymentPlan: 'WEEKLY_INSTALMENTS',
                      })
                    }
                    className={`p-4 border text-left transition-colors ${
                      form.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
                        ? 'border-[#F9501E] bg-[#F9F8F6]'
                        : 'border-neutral-300 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <div className="text-[11px] font-mono font-semibold text-[#F9501E]">
                      OPTION B · WEEKLY INSTALMENTS
                    </div>
                    <div className="font-mono font-bold text-base text-[#111111] mt-1 tabular-nums">
                      {currency} {weeklyFee.toLocaleString()} / wk × {totalWeeks}
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">
                      Three separate weekly invoices ({currency}{' '}
                      {totalFee.toLocaleString()} total, zero interest).
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">
                What do you intend to achieve through this programme? *
              </label>
              <textarea
                rows={3}
                required
                value={form.learningObjectives}
                onChange={(e) =>
                  setForm({ ...form, learningObjectives: e.target.value })
                }
                className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">
                Do you have a project, business idea, website or application you want to
                develop?
              </label>
              <textarea
                rows={2}
                value={form.projectIdea}
                onChange={(e) => setForm({ ...form, projectIdea: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">
                What would a successful outcome look like for you? *
              </label>
              <textarea
                rows={2}
                required
                value={form.expectedOutcome}
                onChange={(e) =>
                  setForm({ ...form, expectedOutcome: e.target.value })
                }
                className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  What days / times are you generally available for training? *
                </label>
                <input
                  type="text"
                  required
                  value={form.availability}
                  onChange={(e) => setForm({ ...form, availability: e.target.value })}
                  placeholder="e.g. Weekdays after 5 PM WAT, Saturdays"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Can you complete practical assignments outside live sessions? *
                </label>
                <select
                  value={form.canCompleteAssignments}
                  onChange={(e) =>
                    setForm({ ...form, canCompleteAssignments: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#F9501E]"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="I may need some flexibility">
                    I may need some flexibility
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#111111] border-b border-neutral-200 pb-2">
              4. Emergency Contact, Declaration &amp; Consent
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Emergency contact — full name and relationship *
                </label>
                <input
                  type="text"
                  required
                  value={form.emergencyContactName}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactName: e.target.value })
                  }
                  placeholder="e.g. Ngozi Anyanwu (Sister)"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Emergency contact — phone number *
                </label>
                <input
                  type="tel"
                  required
                  value={form.emergencyContactPhone}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactPhone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Sponsor / alternative contact (if applicable)
                </label>
                <input
                  type="text"
                  value={form.sponsorName}
                  onChange={(e) => setForm({ ...form, sponsorName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Sponsor / alternative contact phone or email
                </label>
                <input
                  type="text"
                  value={form.sponsorDetails}
                  onChange={(e) =>
                    setForm({ ...form, sponsorDetails: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
            </div>

            <div className="bg-[#F9F8F6] border border-neutral-200 p-5 space-y-3">
              <h4 className="text-sm font-bold text-[#111111]">
                Applicant Declaration &amp; Consent
              </h4>
              <label className="flex items-start gap-2.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentAccuracy}
                  onChange={(e) =>
                    setForm({ ...form, consentAccuracy: e.target.checked })
                  }
                  className="accent-[#F9501E] w-4 h-4 mt-0.5 shrink-0"
                />
                <span>
                  I confirm that the information provided is accurate to the best of my
                  knowledge, and I understand that admission is subject to review and
                  confirmed only after completing the Institute&apos;s enrolment and
                  payment process. *
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentPrivacy}
                  onChange={(e) =>
                    setForm({ ...form, consentPrivacy: e.target.checked })
                  }
                  className="accent-[#F9501E] w-4 h-4 mt-0.5 shrink-0"
                />
                <span>
                  I agree to follow the Institute&apos;s training, safety, and
                  acceptable-use requirements, and I consent to my data being processed
                  for application assessment and training administration in line with
                  the Nigeria Data Protection Act (NDPA). *
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentMedia}
                  onChange={(e) =>
                    setForm({ ...form, consentMedia: e.target.checked })
                  }
                  className="accent-[#F9501E] w-4 h-4 mt-0.5 shrink-0"
                />
                <span>
                  Optional: I grant permission for project highlights or testimonials
                  to be featured by the Institute (separate permission is always
                  respected).
                </span>
              </label>

              <p className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-200">
                Privacy note: Do not submit sensitive identification numbers or detailed
                medical information unless specifically requested for a clear and
                necessary purpose.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Applicant digital signature (type full name) *
                </label>
                <input
                  type="text"
                  required
                  value={form.signatureName}
                  onChange={(e) =>
                    setForm({ ...form, signatureName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1">
                  Parent / guardian signature (if under 18)
                </label>
                <input
                  type="text"
                  value={form.guardianSignature}
                  onChange={(e) =>
                    setForm({ ...form, guardianSignature: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep((s) => s - 1);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-[#111111] hover:bg-neutral-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#111111] text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#F9501E] text-white text-sm font-semibold hover:bg-[#d94316] disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Submitting Application...' : 'Submit Application'}
            </button>
          )}
        </div>
      </form>
      </div>

      {/* Right Column: Sticky Live Programme Briefing & Tuition Breakdown */}
      <aside className="lg:col-span-5 lg:sticky lg:top-28 space-y-5">
        {selectedProgramme && (
          <div className="bg-white border border-neutral-200 p-6 space-y-5">
            <div className="border-b border-neutral-200 pb-4">
              <div className="text-xs font-mono font-semibold text-[#F9501E]">
                SELECTED PROGRAMME BRIEFING · {selectedProgramme.code}
              </div>
              <h3 className="text-lg font-bold text-[#111111] mt-1">
                {selectedProgramme.title}
              </h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                {selectedProgramme.summary}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-700 mt-3">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#F9501E]" />
                  {selectedProgramme.durationText}
                </span>
                <span>· {selectedProgramme.sessionSchedule}</span>
              </div>
            </div>

            {/* Investment Breakdown */}
            <div className="bg-[#F9F8F6] border border-neutral-200 p-4 space-y-2.5 text-xs">
              <div className="font-bold text-[#111111]">
                Tuition Investment Breakdown
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-neutral-600">Weekly Fee</span>
                <span className="font-semibold text-[#111111]">
                  {currency} {weeklyFee.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-neutral-600">Programme Duration</span>
                <span className="font-semibold text-[#111111]">
                  {totalWeeks} Weeks
                </span>
              </div>
              <div className="flex justify-between font-mono tabular-nums pt-2 border-t border-neutral-200">
                <span className="font-bold text-[#111111]">Total Programme Fee</span>
                <span className="font-bold text-sm text-[#F9501E]">
                  {currency} {totalFee.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-200 text-neutral-700">
                {form.preferredPaymentPlan === 'WEEKLY_INSTALMENTS' ? (
                  <div className="space-y-1 font-mono tabular-nums">
                    <div className="font-sans font-semibold text-[#111111]">
                      Selected: Option B — Weekly Instalments
                    </div>
                    {Array.from({ length: totalWeeks }, (_, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>Week {idx + 1} (prior to Week {idx + 1})</span>
                        <span>{currency} {weeklyFee.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-[#111111]">
                      Selected: Option A — Full Payment
                    </span>{' '}
                    ({currency} {totalFee.toLocaleString()} upfront prior to commencement)
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Deliverables */}
            {selectedProgramme.weeklyDeliverables &&
              selectedProgramme.weeklyDeliverables.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
                    <BookOpen className="w-3.5 h-3.5 text-[#F9501E]" />
                    Weekly Deliverables
                  </div>
                  <div className="space-y-2">
                    {selectedProgramme.weeklyDeliverables.map((wk) => (
                      <div
                        key={wk.weekNumber}
                        className="border border-neutral-200 p-3 text-xs"
                      >
                        <div className="font-semibold text-[#111111]">
                          <span className="font-mono text-[#F9501E] mr-1.5">
                            WK 0{wk.weekNumber}
                          </span>
                          {wk.title}
                        </div>
                        <div className="text-neutral-600 mt-1">
                          Output: {wk.produce}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Graduation Outcomes */}
            {selectedProgramme.graduationOutcomes &&
              selectedProgramme.graduationOutcomes.length > 0 && (
                <div className="space-y-2 border-t border-neutral-200 pt-4">
                  <div className="text-xs font-bold text-[#111111]">
                    Graduation Outcomes
                  </div>
                  <ul className="space-y-1.5 text-xs text-neutral-700">
                    {selectedProgramme.graduationOutcomes.map((out, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#F9501E] shrink-0 mt-0.5" />
                        <span>{out}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Payment Policy Assurance */}
            <div className="bg-[#111111] text-white p-4 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-mono font-semibold text-[#F9501E]">
                <ShieldCheck className="w-3.5 h-3.5" />
                PAYMENT &amp; ADMISSIONS POLICY
              </div>
              <p className="text-neutral-300 leading-relaxed">
                No payment is collected during application. Once admitted, invoices
                include {settings?.reminderHoursBeforeDue ?? 48}-hour reminders, a{' '}
                {settings?.gracePeriodHours ?? 48}-hour communicated grace period, and
                receipts issued strictly after verification.
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
