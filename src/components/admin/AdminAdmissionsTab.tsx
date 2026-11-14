import React, { useState } from 'react';
import { Eye, FilePlus2, Search, UserCheck, X } from 'lucide-react';
import { ApplicationRecord, Cohort, Programme } from '../../types';

interface Props {
  applications: ApplicationRecord[];
  programmes: Programme[];
  cohorts: Cohort[];
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
  onInitiateInvoice: (app: ApplicationRecord) => void;
  onInitiateEnrol: (app: ApplicationRecord) => void;
}

const STATUS_OPTIONS = [
  'PENDING',
  'UNDER_REVIEW',
  'ACCEPTED',
  'WAITLISTED',
  'REJECTED',
  'ENROLLED',
];

export default function AdminAdmissionsTab({
  applications,
  programmes,
  cohorts,
  apiFetch,
  onRefresh,
  onInitiateInvoice,
  onInitiateEnrol,
}: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [progFilter, setProgFilter] = useState('');
  const [selected, setSelected] = useState<ApplicationRecord | null>(null);
  const [notes, setNotes] = useState('');
  const [infoRequest, setInfoRequest] = useState('');
  const [assignedProgId, setAssignedProgId] = useState<string>('');
  const [offerCohortId, setOfferCohortId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const openDetail = (app: ApplicationRecord) => {
    setSelected(app);
    setNotes(app.internalNotes || '');
    setInfoRequest(app.infoRequestMessage || '');
    setAssignedProgId(app.programmeId ? String(app.programmeId) : '');
    setOfferCohortId('');
    setFeedback(null);
  };

  const filtered = applications.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (progFilter && String(a.programmeId || '') !== progFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay =
        `${a.referenceNumber} ${a.fullName} ${a.email} ${a.phone} ${a.programmeName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const updateApplication = async (nextStatus?: string) => {
    if (!selected) return;
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await apiFetch<ApplicationRecord>(
        `/api/admin/applications/${selected.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: nextStatus || selected.status,
            internalNotes: notes,
            infoRequestMessage: infoRequest,
            programmeId: assignedProgId ? Number(assignedProgId) : undefined,
          }),
        }
      );
      setSelected(updated);
      setFeedback('Application updated and recorded.');
      await onRefresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  const issueOffer = async () => {
    if (!selected) return;
    setBusy(true);
    setFeedback(null);
    try {
      await apiFetch(`/api/admin/applications/${selected.id}/offer`, {
        method: 'POST',
        body: JSON.stringify({
          cohortId: offerCohortId ? Number(offerCohortId) : null,
          notes,
        }),
      });
      setFeedback('Admission offer issued and applicant notified.');
      await onRefresh();
      setSelected((prev) => (prev ? { ...prev, status: 'ACCEPTED' } : null));
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Offer issuance failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-2 border border-neutral-300 px-3 py-2 bg-[#F9F8F6]">
          <Search className="w-4 h-4 text-neutral-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, applicant name, email, phone..."
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <select
            value={progFilter}
            onChange={(e) => setProgFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 text-sm bg-white"
          >
            <option value="">All Programmes</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-neutral-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-sm text-neutral-600 text-center">
            No applications match your current filter.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F9F8F6] border-b border-neutral-200 text-xs font-semibold text-neutral-600">
              <tr>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Programme</th>
                <th className="py-3 px-4">Setup / Format</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-neutral-50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-[#F9501E] whitespace-nowrap">
                    {app.referenceNumber}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#111111]">
                      {app.fullName}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {app.email} · {app.phone}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-neutral-800">
                    {app.programmeName}
                  </td>
                  <td className="py-3 px-4 text-xs text-neutral-600">
                    {app.preferredSetup}
                    <div className="text-neutral-500">
                      {app.preferredFormat} ·{' '}
                      <span className="font-mono text-[#111111]">
                        {app.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
                          ? 'Weekly Instalments'
                          : 'Full Payment'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs tabular-nums text-neutral-600 whitespace-nowrap">
                    {app.submittedDate}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-[#111111]">
                    {app.status}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      onClick={() => openDetail(app)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-neutral-300 text-xs font-medium hover:bg-neutral-100"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Applicant Review Modal / Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
              <div>
                <div className="font-mono text-xs font-bold text-[#F9501E]">
                  {selected.referenceNumber} · {selected.status}
                </div>
                <h2 className="text-xl font-bold text-[#111111] mt-1">
                  {selected.fullName}
                </h2>
                <p className="text-xs text-neutral-500">
                  {selected.email} · {selected.phone} · {selected.stateCity}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 border border-neutral-200 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Personal & Background */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#F9F8F6] p-4 border border-neutral-200">
              <div>
                <span className="text-neutral-500 block">Date of Birth / Nationality</span>
                <span className="font-medium text-[#111111]">
                  {selected.dateOfBirth} · {selected.nationality}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Qualification / Status</span>
                <span className="font-medium text-[#111111]">
                  {selected.highestQualification} · {selected.professionalStatus}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Devices &amp; Internet</span>
                <span className="font-medium text-[#111111]">
                  {selected.availableDevices.join(', ')} ({selected.internetAccess})
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Emergency Contact</span>
                <span className="font-medium text-[#111111]">
                  {selected.emergencyContactName} ({selected.emergencyContactPhone})
                </span>
              </div>
              <div className="sm:col-span-2 border-t border-neutral-200 pt-2">
                <span className="text-neutral-500 block">
                  Requested Payment Plan &amp; Format
                </span>
                <span className="font-mono font-semibold text-[#F9501E]">
                  {selected.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
                    ? 'Option B — Weekly Instalments'
                    : 'Option A — Full Payment'}
                </span>{' '}
                <span className="text-neutral-600">
                  · {selected.preferredFormat} · {selected.preferredSetup}
                </span>
              </div>
            </div>

            {/* Technical Readiness Matrix */}
            <div>
              <h3 className="text-sm font-bold text-[#111111] mb-2">
                Technical Readiness Matrix
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(selected.toolFamiliarity || {}).map(
                  ([tool, lvl]) => (
                    <div
                      key={tool}
                      className="border border-neutral-200 p-2.5 bg-white"
                    >
                      <div className="text-neutral-500">{tool}</div>
                      <div className="font-semibold text-[#111111] mt-0.5">
                        {lvl}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Objectives */}
            <div className="space-y-3 text-sm border-t border-neutral-200 pt-4">
              <div>
                <div className="text-xs font-semibold text-neutral-500">
                  Learning Objectives
                </div>
                <p className="text-neutral-800 mt-0.5">
                  {selected.learningObjectives}
                </p>
              </div>
              {selected.projectIdea && (
                <div>
                  <div className="text-xs font-semibold text-neutral-500">
                    Project Idea
                  </div>
                  <p className="text-neutral-800 mt-0.5">{selected.projectIdea}</p>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-neutral-500">
                  Expected Outcome &amp; Availability
                </div>
                <p className="text-neutral-800 mt-0.5">
                  {selected.expectedOutcome} (Available: {selected.availability})
                </p>
              </div>
            </div>

            {/* Administrative Review Controls */}
            <div className="border-t border-neutral-200 pt-5 space-y-4">
              <h3 className="text-sm font-bold text-[#111111]">
                Admissions Decision &amp; Notes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Assigned Programme
                  </label>
                  <select
                    value={assignedProgId}
                    onChange={(e) => setAssignedProgId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                  >
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Offer Cohort (optional)
                  </label>
                  <select
                    value={offerCohortId}
                    onChange={(e) => setOfferCohortId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                  >
                    <option value="">Assign later</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Internal Administrative Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Request Additional Information (visible to applicant)
                </label>
                <input
                  type="text"
                  value={infoRequest}
                  onChange={(e) => setInfoRequest(e.target.value)}
                  placeholder="Optional message requesting clarification"
                  className="w-full px-3 py-2 border border-neutral-300 text-sm"
                />
              </div>

              {feedback && (
                <p className="text-xs font-semibold text-[#F9501E]">{feedback}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => updateApplication('UNDER_REVIEW')}
                  className="px-3.5 py-2 border border-neutral-300 text-xs font-medium hover:bg-neutral-50"
                >
                  Mark Under Review
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={issueOffer}
                  className="px-4 py-2 bg-[#16A34A] text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  Approve &amp; Issue Offer
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => updateApplication('WAITLISTED')}
                  className="px-3.5 py-2 border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-50"
                >
                  Waitlist
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => updateApplication('REJECTED')}
                  className="px-3.5 py-2 border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50"
                >
                  Reject
                </button>
              </div>

              {/* Financial Onboarding & Enrolment Bridges */}
              <div className="border-t border-neutral-200 pt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onInitiateInvoice(selected);
                    setSelected(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#111111] text-white text-xs font-medium hover:bg-neutral-800"
                >
                  <FilePlus2 className="w-4 h-4" />
                  Create Proforma Invoice
                </button>
                {selected.status !== 'ENROLLED' && (
                  <button
                    type="button"
                    onClick={() => {
                      onInitiateEnrol(selected);
                      setSelected(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316]"
                  >
                    <UserCheck className="w-4 h-4" />
                    Enrol Student &amp; Onboard
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
