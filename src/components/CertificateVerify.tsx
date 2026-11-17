import React, { useState } from 'react';
import { apiUrl } from '../lib/api';
import { CheckCircle2, Search, ShieldAlert, ArrowLeft } from 'lucide-react';
import BrandEmblem from './BrandEmblem';

interface VerificationResult {
  valid: boolean;
  status?: string;
  certificateNumber?: string;
  studentFullName?: string;
  programmeTitle?: string;
  completionDate?: string;
  issuedDate?: string;
  issuingInstitution?: string;
  error?: string;
}

export default function CertificateVerify({
  onBack,
}: {
  onBack?: () => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(apiUrl(`/api/public/verify/${encodeURIComponent(cleaned)}`));
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        valid: false,
        error: 'Unable to reach certificate verification registry.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#111111] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-[#111111] mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Artdrobotix Institute
          </button>
        )}

        <div className="bg-white border border-neutral-200 border-t-[3px] border-t-[#F9501E] p-6 sm:p-10">
          <div className="group flex items-center gap-4 pb-6 border-b border-neutral-200">
            <BrandEmblem size="card" tone="light" alt="Artdrobotix Institute Seal" />
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#111111]">
                Official Certificate Verification
              </h1>
              <p className="text-xs text-neutral-600 mt-0.5">
                Artdrobotix Institute · School of Art, Science &amp; Technology
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-700 mt-6 mb-6 leading-relaxed">
            Enter the official certificate reference number (e.g.{' '}
            <span className="font-mono text-xs text-[#111111]">
              ARTI-CERT-2026-0001
            </span>
            ) or verification code printed on the certificate to confirm its
            authenticity.
          </p>

          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Certificate Reference (e.g. ARTI-CERT-2026-0001)"
              className="flex-1 px-4 py-3 border border-neutral-300 text-sm font-mono uppercase focus:outline-none focus:border-[#F9501E]"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F9501E] text-white text-sm font-semibold hover:bg-[#d94316] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Verifying...' : 'Verify Credential'}
            </button>
          </form>

          {result && (
            <div className="mt-8 border-t border-neutral-200 pt-6">
              {result.valid ? (
                <div className="bg-emerald-50/60 border border-emerald-200 p-6">
                  <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-base mb-4">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Verified Valid Institutional Certificate</span>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-neutral-500 text-xs">Certificate Number</dt>
                      <dd className="font-mono font-semibold text-[#111111] mt-0.5 tabular-nums">
                        {result.certificateNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 text-xs">Credential Status</dt>
                      <dd className="font-semibold text-emerald-700 mt-0.5">
                        {result.status}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 text-xs">Recipient Full Name</dt>
                      <dd className="font-semibold text-[#111111] mt-0.5">
                        {result.studentFullName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 text-xs">Programme Completed</dt>
                      <dd className="font-semibold text-[#111111] mt-0.5">
                        {result.programmeTitle}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 text-xs">Completion Date</dt>
                      <dd className="font-mono text-xs text-[#111111] mt-0.5 tabular-nums">
                        {result.completionDate}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 text-xs">Date Issued</dt>
                      <dd className="font-mono text-xs text-[#111111] mt-0.5 tabular-nums">
                        {result.issuedDate}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-neutral-500 text-xs">Issuing Institution</dt>
                      <dd className="font-medium text-[#111111] mt-0.5">
                        {result.issuingInstitution}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 p-6 flex items-start gap-3 text-red-800">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">
                      {result.status === 'REVOKED'
                        ? 'Certificate Revoked'
                        : 'Certificate Not Found'}
                    </p>
                    <p className="text-xs mt-1">
                      {result.error ||
                        'This reference does not correspond to an active valid certificate issued by Artdrobotix Institute.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
