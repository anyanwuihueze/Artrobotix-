import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogIn,
  Menu,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { InstituteSettings, Programme, Cohort, AppUser } from '../types';
import ApplicationForm from './ApplicationForm';
import heroTechStudioImg from '../assets/images/hero_tech_studio_1794601462603.jpg';
import bootcampDevicesImg from '../assets/images/bootcamp_devices_1794601463545.jpg';

interface PublicWebsiteProps {
  settings: InstituteSettings | null;
  programmes: Programme[];
  cohorts: Cohort[];
  currentUser: AppUser | null;
  onSignIn: () => void;
  onOpenPortal: () => void;
  onOpenVerify: () => void;
}

export default function PublicWebsite({
  settings,
  programmes,
  cohorts,
  currentUser,
  onSignIn,
  onOpenPortal,
  onOpenVerify,
}: PublicWebsiteProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<number | null>(null);
  const [inspectedProgramme, setInspectedProgramme] = useState<Programme | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  // Application status tracker state
  const [trackRef, setTrackRef] = useState('');
  const [trackEmail, setTrackEmail] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackResult, setTrackResult] = useState<{
    referenceNumber: string;
    fullName: string;
    programmeName: string;
    preferredFormat: string;
    status: string;
    submittedDate: string;
    infoRequestMessage: string | null;
  } | null>(null);

  const openApplyFor = (programmeId?: number) => {
    setInspectedProgramme(null);
    setSelectedProgrammeId(programmeId ?? programmes[0]?.id ?? null);
    setShowApplicationModal(true);
    setTimeout(() => {
      document.getElementById('application-section')?.scrollIntoView({
        behavior: 'smooth',
      });
    }, 60);
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackLoading(true);
    setTrackError(null);
    setTrackResult(null);
    try {
      const res = await fetch(
        `/api/public/applications/track?ref=${encodeURIComponent(
          trackRef.trim()
        )}&email=${encodeURIComponent(trackEmail.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Application not found.');
      setTrackResult(data);
    } catch (err) {
      setTrackError(
        err instanceof Error ? err.message : 'Unable to locate application.'
      );
    } finally {
      setTrackLoading(false);
    }
  };

  const currency = settings?.currency || 'NGN';

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#111111]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-t-[3px] border-t-[#F9501E] border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 lg:h-24 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#home"
            className="flex items-center gap-3.5 text-[#111111] whitespace-nowrap shrink-0"
          >
            <img
              src="/assets/artdrobotix_seal.jpg"
              alt="Artdrobotix Institute Seal"
              className="w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full object-contain shrink-0 ring-1 ring-neutral-200"
              referrerPolicy="no-referrer"
            />
            <span className="font-display text-lg sm:text-xl lg:text-[22px] font-extrabold tracking-[-0.02em] text-[#111111] whitespace-nowrap">
              ARTDROBOTIX <span className="text-[#F9501E]">INSTITUTE</span>
            </span>
          </a>

          {/* Zone 2: Concise single-line nav links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-neutral-700">
            <a
              href="#about"
              className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0"
            >
              About
            </a>
            <a
              href="#programmes"
              className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0"
            >
              Programmes
            </a>
            <a
              href="#tuition"
              className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0"
            >
              Tuition &amp; Plans
            </a>
            <a
              href="#methodology"
              className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0"
            >
              Methodology
            </a>
            <a
              href="#instructor"
              className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0"
            >
              Instructor
            </a>
            <button
              type="button"
              onClick={onOpenVerify}
              className="hover:text-[#111111] transition-colors whitespace-nowrap shrink-0"
            >
              Verify
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA + Mobile Menu Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openApplyFor()}
              className="hidden sm:inline-flex items-center px-5 py-2.5 bg-[#111111] text-white text-sm font-semibold hover:bg-[#F9501E] transition-colors whitespace-nowrap shrink-0"
            >
              Apply Now
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2.5 border border-neutral-200 text-[#111111]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-neutral-200 bg-white px-4 py-4 space-y-3">
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#111111]"
            >
              About the Institute
            </a>
            <a
              href="#programmes"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#111111]"
            >
              Programmes
            </a>
            <a
              href="#methodology"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#111111]"
            >
              Training Methodology
            </a>
            <a
              href="#instructor"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#111111]"
            >
              Instructor
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#111111]"
            >
              Contact
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenVerify();
              }}
              className="block w-full text-left py-2 text-sm font-medium text-[#111111]"
            >
              Verify Certificate
            </button>
            <div className="pt-2 border-t border-neutral-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openApplyFor();
                }}
                className="w-full py-2.5 bg-[#F9501E] text-white text-sm font-semibold"
              >
                Apply Now
              </button>
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenPortal();
                  }}
                  className="w-full py-2.5 bg-[#111111] text-white text-sm font-medium"
                >
                  Open Digital Campus Portal
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignIn();
                  }}
                  className="w-full py-2.5 border border-neutral-300 text-[#111111] text-sm font-medium"
                >
                  Student &amp; Staff Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="text-xs font-semibold text-[#F9501E] tracking-wide">
                  {settings?.descriptor || 'SCHOOL OF ART, SCIENCE & TECHNOLOGY'}
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-[3.1rem] font-extrabold tracking-tight text-[#111111] leading-[1.08] max-w-2xl [text-wrap:balance]">
                  BUILD THE FUTURE. LEARN THE TECHNOLOGY. CREATE REAL-WORLD SOLUTIONS.
                </h1>
                <p className="text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed">
                  Practical technology education designed to help individuals
                  develop, build and deploy real-world digital products—whether
                  starting on a laptop or a smartphone.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => openApplyFor()}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#F9501E] text-white text-sm font-semibold hover:bg-[#d94316] transition-colors whitespace-nowrap"
                >
                  Start Student Application
                  <ArrowRight className="w-4 h-4" />
                </button>

                {currentUser ? (
                  <button
                    type="button"
                    onClick={onOpenPortal}
                    className="inline-flex items-center gap-2 px-5 py-3.5 bg-[#111111] text-white text-sm font-medium hover:bg-neutral-800 transition-colors whitespace-nowrap"
                  >
                    Open Campus Portal ({currentUser.role.replace('_', ' ')})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="inline-flex items-center gap-2 px-5 py-3.5 border border-neutral-300 bg-white text-[#111111] text-sm font-medium hover:bg-neutral-50 transition-colors whitespace-nowrap"
                  >
                    <LogIn className="w-4 h-4" />
                    Student &amp; Staff Portal
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[260px] lg:min-h-[380px] border border-neutral-200 overflow-hidden bg-neutral-100">
                <img
                  src={heroTechStudioImg}
                  alt="Builders collaborating at Artdrobotix Institute practical engineering studio"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          {/* 4-column Institutional Summary Strip below hero split */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-10 mt-10 border-t border-neutral-200">
            <div>
              <div className="text-xs text-neutral-500">Core Bootcamp Cadence</div>
              <div className="text-lg font-bold text-[#111111] mt-1 tabular-nums">
                3 Weeks · 27 Hours
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Device Pathways</div>
              <div className="text-lg font-bold text-[#111111] mt-1">
                Laptop or Smartphone
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Active Programmes</div>
              <div className="text-lg font-bold text-[#111111] mt-1 tabular-nums">
                {programmes.length} Specialised Tracks
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Upcoming Batches</div>
              <div className="text-lg font-bold text-[#111111] mt-1 tabular-nums">
                {cohorts.length} Open Cohorts
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About & Two Ways to Build */}
      <section id="about" className="py-16 lg:py-20 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-5">
              <div className="h-full min-h-[240px] border border-neutral-200 overflow-hidden bg-white">
                <img
                  src={bootcampDevicesImg}
                  alt="Laptop and smartphone development setup"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div>
                <p className="text-xs font-semibold text-[#F9501E] mb-2">
                  ABOUT ARTDROBOTIX INSTITUTE
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
                  Two Ways to Build. Zero Prior Coding Required.
                </h2>
              </div>
              <p className="text-neutral-700 leading-relaxed">
                Artdrobotix Institute bridges creativity, applied science, and
                modern software engineering. Every student works on real business
                tools, web platforms, mobile apps, and AI workflows—guided through
                structured weekly sprints until their project is live online.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="bg-white border border-neutral-200 p-5">
                  <div className="text-xs font-mono font-semibold text-[#F9501E] mb-1">
                    01. MOBILE-FIRST DEVELOPMENT
                  </div>
                  <h3 className="font-bold text-[#111111] mb-2">
                    Build Straight From Your Phone
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    No laptop yet? Learn to architect, prompt, connect databases,
                    and deploy live apps using cloud-based AI development tools on
                    Android or iPhone.
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-5">
                  <div className="text-xs font-mono font-semibold text-[#F9501E] mb-1">
                    02. LAPTOP ENGINEERING
                  </div>
                  <h3 className="font-bold text-[#111111] mb-2">
                    Modern IDE &amp; Full-Stack Tools
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Work in VS Code, GitHub, Google AI Studio, APIs, and PostgreSQL
                    databases to ship custom websites, agents, and SaaS platforms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programmes Section (Dynamic fees & curriculum from PostgreSQL) */}
      <section
        id="programmes"
        className="py-16 lg:py-20 bg-white border-b border-neutral-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#F9501E] mb-2">
                INSTITUTIONAL PROGRAMMES
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
                Practical 3-Week Professional Training Tracks
              </h2>
              <p className="text-neutral-600 mt-2">
                Hands-on engineering, AI-assisted product development, real database
                connectivity, and production deployment. Inspect any track&apos;s
                weekly deliverables and graduation outcomes before applying.
              </p>
            </div>
            <div className="border border-neutral-200 bg-[#F9F8F6] px-5 py-3.5 text-xs shrink-0">
              <div className="text-neutral-500">Standard Weekly Tuition · 3 Weeks</div>
              <div className="font-mono font-bold text-base text-[#111111] mt-0.5 tabular-nums">
                {currency}{' '}
                {(programmes[0]?.weeklyFeeAmount ?? 430000).toLocaleString()} / week · Total{' '}
                <span className="text-[#F9501E]">
                  {currency} {(programmes[0]?.feeAmount ?? 1290000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programmes.map((prog, idx) => (
              <article
                key={prog.id}
                className="border border-neutral-200 bg-[#F9F8F6] p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
                    <span className="font-mono font-semibold text-[#F9501E]">
                      0{idx + 1}. {prog.code}
                    </span>
                    <span>{prog.deliveryFormat}</span>
                  </div>

                  <h3 className="text-lg font-bold text-[#111111] mb-2">
                    {prog.title}
                  </h3>
                  <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                    {prog.description}
                  </p>

                  <div className="border-t border-neutral-200 pt-4 space-y-3 mb-5">
                    <div className="text-xs text-neutral-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#F9501E] shrink-0" />
                      <span>{prog.sessionSchedule || prog.durationText}</span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-[#111111] mb-1">
                        Weekly Deliverables Overview
                      </div>
                      {prog.weeklyDeliverables && prog.weeklyDeliverables.length > 0 ? (
                        <ul className="text-xs text-neutral-600 space-y-1">
                          {prog.weeklyDeliverables.map((wk) => (
                            <li key={wk.weekNumber}>
                              <span className="font-mono font-semibold text-[#111111]">
                                Wk {wk.weekNumber}:
                              </span>{' '}
                              {wk.produce}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="text-xs text-neutral-600 space-y-1">
                          {prog.learningObjectives.slice(0, 3).map((obj, i) => (
                            <li key={i}>· {obj}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-[#111111] mb-1">
                        Core Technical Skills
                      </div>
                      <div className="text-xs text-neutral-600">
                        {prog.skillsAcquired.join(' · ')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-4 space-y-3">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-mono text-neutral-600 tabular-nums">
                        {currency} {prog.weeklyFeeAmount.toLocaleString()}/wk ·{' '}
                        {prog.durationWeeks} weeks
                      </span>
                      <span className="text-lg font-bold font-mono tabular-nums text-[#111111]">
                        {currency} {prog.feeAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      {prog.allowsInstalments
                        ? `Pay upfront (${currency} ${prog.feeAmount.toLocaleString()}) or ${prog.durationWeeks} weekly instalments (${currency} ${prog.weeklyFeeAmount.toLocaleString()}/wk)`
                        : 'Full payment before commencement'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectedProgramme(prog)}
                      className="py-2.5 px-3 border border-neutral-300 bg-white text-[#111111] text-xs font-semibold hover:bg-neutral-50 transition-colors"
                    >
                      Curriculum &amp; Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => openApplyFor(prog.id)}
                      className="py-2.5 px-3 bg-[#111111] text-white text-xs font-semibold hover:bg-[#F9501E] transition-colors"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Transparent Tuition Investment, Payment Options & Institute Policy */}
      <section
        id="tuition"
        className="py-16 lg:py-20 bg-[#F9F8F6] border-b border-neutral-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#F9501E] mb-2">
              TRANSPARENT TUITION &amp; PAYMENT STRUCTURE
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
              Clear Programme Pricing. Two Flexible Payment Options.
            </h2>
            <p className="text-neutral-600 mt-2">
              All tuition charges are transparent before admission confirmation—with zero
              hidden administrative levies or unexpected surcharges.
            </p>
          </div>

          {(() => {
            const refProg = programmes[0];
            const weeklyFee = refProg?.weeklyFeeAmount ?? 430000;
            const weeks = refProg?.durationWeeks ?? 3;
            const totalFee = refProg?.feeAmount ?? weeklyFee * weeks;
            const reminderHrs = settings?.reminderHoursBeforeDue ?? 48;
            const graceHrs = settings?.gracePeriodHours ?? 48;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Option A: Full Payment */}
                <div className="lg:col-span-4 bg-white border border-neutral-200 p-7 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono font-semibold text-[#F9501E]">
                      OPTION A · SINGLE UPFRONT SETTLEMENT
                    </div>
                    <h3 className="text-xl font-bold text-[#111111] mt-2">
                      Full Programme Payment
                    </h3>
                    <div className="text-3xl font-extrabold font-mono tabular-nums text-[#111111] mt-4">
                      {currency} {totalFee.toLocaleString()}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 font-mono tabular-nums">
                      {weeks} Weeks × {currency} {weeklyFee.toLocaleString()} / week
                    </p>
                    <ul className="mt-5 pt-4 border-t border-neutral-200 space-y-2 text-sm text-neutral-700">
                      <li>· Single consolidated Proforma Invoice covering Weeks 1–{weeks}</li>
                      <li>· Settled in full prior to programme commencement</li>
                      <li>· Priority cohort onboarding and resource provisioning</li>
                      <li>· Official Receipt issued upon payment verification</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => openApplyFor()}
                    className="mt-6 w-full py-2.5 bg-[#111111] text-white text-xs font-semibold hover:bg-[#F9501E] transition-colors"
                  >
                    Apply with Full Payment
                  </button>
                </div>

                {/* Option B: Weekly Instalments */}
                <div className="lg:col-span-4 bg-[#111111] text-white p-7 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono font-semibold text-[#F9501E]">
                      OPTION B · STRUCTURED WEEKLY INSTALMENTS
                    </div>
                    <h3 className="text-xl font-bold mt-2">
                      Weekly Instalment Schedule
                    </h3>
                    <div className="text-3xl font-extrabold font-mono tabular-nums text-white mt-4">
                      {currency} {weeklyFee.toLocaleString()}
                      <span className="text-sm font-normal text-neutral-400"> / week</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 font-mono tabular-nums">
                      Total across {weeks} weeks: {currency} {totalFee.toLocaleString()} (0% surcharge)
                    </p>
                    <div className="mt-5 pt-4 border-t border-neutral-800 space-y-2.5 text-sm">
                      {Array.from({ length: weeks }, (_, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-neutral-200 font-mono text-xs tabular-nums"
                        >
                          <span>Week {idx + 1} · Due before Week {idx + 1}</span>
                          <span className="font-bold text-white">
                            {currency} {weeklyFee.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openApplyFor()}
                    className="mt-6 w-full py-2.5 bg-[#F9501E] text-white text-xs font-semibold hover:bg-[#d94316] transition-colors"
                  >
                    Apply with Weekly Instalments
                  </button>
                </div>

                {/* Considerate Payment Policy & Verification Rules */}
                <div className="lg:col-span-4 bg-white border border-neutral-200 p-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#111111]">
                      <ShieldCheck className="w-4 h-4 text-[#F9501E]" />
                      INSTITUTE PAYMENT POLICY
                    </div>
                    <h3 className="text-xl font-bold text-[#111111] mt-2">
                      Considerate, Auditable Billing
                    </h3>
                    <p className="text-sm text-neutral-600 mt-3 leading-relaxed">
                      {settings?.paymentPolicySummary ||
                        'Invoices are issued ahead of payment due dates. Automated reminders are sent 48 hours before deadlines, and a 48-hour grace period applies for communicated delays.'}
                    </p>
                    <div className="mt-5 pt-4 border-t border-neutral-200 space-y-2.5 text-xs text-neutral-700">
                      <div className="flex justify-between font-mono tabular-nums">
                        <span className="text-neutral-500">Pre-deadline Reminder</span>
                        <span className="font-bold text-[#111111]">{reminderHrs} Hours Prior</span>
                      </div>
                      <div className="flex justify-between font-mono tabular-nums">
                        <span className="text-neutral-500">Communicated Grace Period</span>
                        <span className="font-bold text-[#111111]">{graceHrs} Hours</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-neutral-500">Supported Methods</span>
                        <span className="font-bold text-[#111111]">Bank Transfer &amp; Paystack</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-neutral-500">Receipt Issuance</span>
                        <span className="font-bold text-emerald-700">Strict Verification Only</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-neutral-200 text-xs text-neutral-500">
                    Enrolled students track every invoice, upload transfer proofs, download
                    verified receipts, and view running ledger balances inside the Student Portal.
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Training Methodology */}
      <section
        id="methodology"
        className="py-16 lg:py-20 border-b border-neutral-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-[#F9501E] mb-2">
              TRAINING METHODOLOGY
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
              What You Build in 3 Practical Weeks
            </h2>
            <p className="text-neutral-600 mt-2">
              Three sessions weekly, three practical hours per session—designed for
              business owners, students, side-hustlers, and freelancers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111111] text-white p-7">
              <div className="text-xs font-mono text-[#F9501E] mb-2">
                WEEK 01 · 3 SESSIONS / 9 HOURS
              </div>
              <h3 className="text-xl font-bold mb-3">Idea to First Build</h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Configure your development workflow on phone or laptop and turn your
                concept into a working website or mobile application screen.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 p-7">
              <div className="text-xs font-mono text-[#F9501E] mb-2">
                WEEK 02 · 3 SESSIONS / 9 HOURS
              </div>
              <h3 className="text-xl font-bold text-[#111111] mb-3">
                Make It Work
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Connect real databases, integrate AI assistants or automation
                agents, and implement the core business workflows your solution
                requires.
              </p>
            </div>

            <div className="bg-[#F9501E] text-white p-7">
              <div className="text-xs font-mono text-white/90 mb-2">
                WEEK 03 · 3 SESSIONS / 9 HOURS
              </div>
              <h3 className="text-xl font-bold mb-3">Launch It Live</h3>
              <p className="text-sm text-white/95 leading-relaxed">
                Deploy your finished project online, pass practical evaluations, and
                graduate with a live digital product and verifiable credential.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Instructor Profile */}
      <section
        id="instructor"
        className="py-16 lg:py-20 bg-white border-b border-neutral-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-4">
              <div className="aspect-square border border-neutral-200 overflow-hidden bg-neutral-100">
                <img
                  src="/assets/instructor_prince_anyanwu.jpg"
                  alt={settings?.instructorName || 'Prince Anyanwu'}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="lg:col-span-8 space-y-5">
              <div>
                <p className="text-xs font-semibold text-[#F9501E] mb-1">
                  FACULTY &amp; TECHNICAL LEADERSHIP
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#111111]">
                  {settings?.instructorName || 'Prince Anyanwu'}
                </h2>
                <p className="text-sm font-medium text-neutral-600 mt-1">
                  {settings?.instructorTitle ||
                    'AI Systems Engineer | Automation Architect | Product Builder'}
                </p>
              </div>

              <p className="text-neutral-700 leading-relaxed max-w-2xl">
                {settings?.instructorBio}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-sm">
                <div className="border border-neutral-200 p-3.5">
                  <div className="font-semibold text-[#111111]">
                    AI Systems Engineering
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Applied LLM &amp; agent pipelines
                  </div>
                </div>
                <div className="border border-neutral-200 p-3.5">
                  <div className="font-semibold text-[#111111]">
                    Automation Architecture
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    APIs, webhooks &amp; business tools
                  </div>
                </div>
                <div className="border border-neutral-200 p-3.5">
                  <div className="font-semibold text-[#111111]">
                    Real-World Delivery
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Production web &amp; mobile apps
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {settings?.instructorPortfolioUrl && (
                  <a
                    href={settings.instructorPortfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
                  >
                    View Portfolio
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {settings?.instructorGithubUrl && (
                  <a
                    href={settings.instructorGithubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-300 text-[#111111] text-xs font-medium hover:bg-neutral-50 transition-colors"
                  >
                    GitHub
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student Application & Status Tracker */}
      <section
        id="application-section"
        className="py-16 lg:py-20 border-b border-neutral-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#F9501E] mb-2">
                ADMISSIONS &amp; APPLICATION TRACKING
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111111]">
                Apply or Track Your Application
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowApplicationModal(!showApplicationModal)}
              className="px-5 py-2.5 bg-[#F9501E] text-white text-sm font-semibold hover:bg-[#d94316] transition-colors self-start"
            >
              {showApplicationModal
                ? 'Hide Application Form'
                : 'Open Student Application Form'}
            </button>
          </div>

          {showApplicationModal && (
            <ApplicationForm
              programmes={programmes}
              settings={settings}
              initialProgrammeId={selectedProgrammeId}
              onBackToSite={() => setShowApplicationModal(false)}
            />
          )}

          {/* Application Status Tracker */}
          <div className="bg-white border border-neutral-200 p-6 sm:p-8 max-w-3xl">
            <h3 className="text-lg font-bold text-[#111111] mb-1">
              Track Application Status
            </h3>
            <p className="text-sm text-neutral-600 mb-5">
              Enter your application reference number and registered email address to
              check review progress.
            </p>

            <form
              onSubmit={handleTrackSubmit}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <input
                type="text"
                required
                value={trackRef}
                onChange={(e) => setTrackRef(e.target.value)}
                placeholder="Reference (e.g. ARTI-APP-2026-0001)"
                className="px-3.5 py-2.5 border border-neutral-300 text-sm font-mono uppercase focus:outline-none focus:border-[#F9501E]"
              />
              <input
                type="email"
                required
                value={trackEmail}
                onChange={(e) => setTrackEmail(e.target.value)}
                placeholder="Applicant email"
                className="px-3.5 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#F9501E]"
              />
              <button
                type="submit"
                disabled={trackLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#111111] text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                {trackLoading ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            {trackError && (
              <p className="text-sm text-red-700 mt-4">{trackError}</p>
            )}

            {trackResult && (
              <div className="mt-5 p-4 bg-[#F9F8F6] border border-neutral-200 space-y-2 text-sm">
                <div className="flex items-center gap-2 font-bold text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#F9501E]" />
                  <span>
                    {trackResult.fullName} · {trackResult.referenceNumber}
                  </span>
                </div>
                <div className="text-neutral-700">
                  Programme: <span className="font-medium">{trackResult.programmeName}</span>{' '}
                  · Format: {trackResult.preferredFormat}
                </div>
                <div className="text-neutral-700">
                  Current Status:{' '}
                  <span className="font-mono font-bold text-[#F9501E]">
                    {trackResult.status}
                  </span>{' '}
                  (Submitted {trackResult.submittedDate})
                </div>
                {trackResult.infoRequestMessage && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs mt-2">
                    Admissions Note: {trackResult.infoRequestMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section & Quiet Footer */}
      <footer id="contact" className="bg-[#111111] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-neutral-800">
            <div>
              <div className="font-bold text-lg tracking-tight">
                {settings?.instituteName || 'ARTDROBOTIX INSTITUTE'}
              </div>
              <div className="text-xs text-[#F9501E] font-semibold mt-1">
                {settings?.descriptor || 'SCHOOL OF ART, SCIENCE & TECHNOLOGY'}
              </div>
              <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
                {settings?.address ||
                  'Lagos, Nigeria — In-Person Studio & Live Online Campus'}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold text-neutral-400 mb-3">
                ADMISSIONS &amp; WHATSAPP DESK
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-white">
                {settings?.whatsappNumbers || '0706 812 4439 | 0911 427 6223'}
              </div>
              <p className="text-sm text-neutral-400 mt-2">
                {settings?.supportEmail || 'admissions@artdrobotix.edu.ng'}
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="text-xs font-semibold text-neutral-400 mb-3">
                CAMPUS ACCESS
              </div>
              <button
                type="button"
                onClick={currentUser ? onOpenPortal : onSignIn}
                className="block text-neutral-200 hover:text-[#F9501E] transition-colors"
              >
                {currentUser ? 'Open Digital Campus Portal' : 'Student & Staff Sign In'}
              </button>
              <button
                type="button"
                onClick={onOpenVerify}
                className="block text-neutral-200 hover:text-[#F9501E] transition-colors"
              >
                Verify Official Certificate (/verify)
              </button>
              <button
                type="button"
                onClick={() => openApplyFor()}
                className="block text-neutral-200 hover:text-[#F9501E] transition-colors"
              >
                Submit Student Application
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <span>
              © {new Date().getFullYear()} Artdrobotix Institute. All rights reserved.
            </span>
            <span>
              Data protection aligned with the Nigeria Data Protection Act (NDPA).
            </span>
          </div>
        </div>
      </footer>

      {/* Programme Curriculum, Weekly Deliverables & Pricing Modal */}
      {inspectedProgramme && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={`${inspectedProgramme.title} Curriculum and Pricing`}
        >
          <div className="bg-white w-full max-w-3xl h-full overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <div className="font-mono text-xs font-bold text-[#F9501E]">
                  {inspectedProgramme.code} · {inspectedProgramme.deliveryFormat}
                </div>
                <h2 className="text-2xl font-bold text-[#111111] mt-1">
                  {inspectedProgramme.title}
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  {inspectedProgramme.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedProgramme(null)}
                className="p-2 border border-neutral-300 hover:bg-neutral-100 shrink-0"
                aria-label="Close curriculum details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Commitment & Fee Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F9F8F6] border border-neutral-200 p-4 text-xs">
              <div>
                <div className="text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#F9501E]" />
                  Duration &amp; Schedule
                </div>
                <div className="font-bold text-[#111111] mt-1">
                  {inspectedProgramme.durationText}
                </div>
                <div className="text-neutral-600 mt-0.5">
                  {inspectedProgramme.sessionSchedule}
                </div>
              </div>
              <div>
                <div className="text-neutral-500">Weekly Fee</div>
                <div className="font-mono font-bold text-base text-[#111111] mt-1 tabular-nums">
                  {currency} {inspectedProgramme.weeklyFeeAmount.toLocaleString()} / wk
                </div>
                <div className="text-neutral-600 mt-0.5">
                  Option B: {inspectedProgramme.durationWeeks} weekly invoices
                </div>
              </div>
              <div>
                <div className="text-neutral-500">Total Programme Investment</div>
                <div className="font-mono font-bold text-base text-[#F9501E] mt-1 tabular-nums">
                  {currency} {inspectedProgramme.feeAmount.toLocaleString()}
                </div>
                <div className="text-neutral-600 mt-0.5">
                  Option A: Full upfront payment
                </div>
              </div>
            </div>

            {/* Configurable Weekly Deliverables */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#111111]">
                <BookOpen className="w-4 h-4 text-[#F9501E]" />
                Weekly Curriculum &amp; Tangible Deliverables
              </div>
              {inspectedProgramme.weeklyDeliverables &&
              inspectedProgramme.weeklyDeliverables.length > 0 ? (
                <div className="space-y-4">
                  {inspectedProgramme.weeklyDeliverables.map((wk) => (
                    <div
                      key={wk.weekNumber}
                      className="border border-neutral-200 p-5 bg-white space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-neutral-200 pb-2">
                        <div className="font-bold text-sm text-[#111111]">
                          <span className="font-mono text-[#F9501E] mr-2">
                            WEEK 0{wk.weekNumber}
                          </span>
                          {wk.title}
                        </div>
                        <div className="font-mono text-xs text-neutral-500">
                          {wk.sessionCommitment}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="font-semibold text-[#111111] mb-1">
                            Learn
                          </div>
                          <ul className="space-y-1 text-neutral-600">
                            {wk.learn.map((item, i) => (
                              <li key={i}>· {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-semibold text-[#111111] mb-1">
                            Practise
                          </div>
                          <ul className="space-y-1 text-neutral-600">
                            {wk.practise.map((item, i) => (
                              <li key={i}>· {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-[#F9F8F6] border border-neutral-200 p-3">
                          <div className="font-semibold text-[#F9501E] mb-1">
                            Deliverable Produced
                          </div>
                          <p className="text-neutral-800 leading-relaxed">
                            {wk.produce}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {inspectedProgramme.modules.map((m, i) => (
                    <div key={i} className="border border-neutral-200 p-4 text-xs">
                      <div className="font-bold text-sm">
                        {m.title} ({m.duration})
                      </div>
                      <ul className="mt-1.5 space-y-1 text-neutral-600">
                        {m.topics.map((t, ti) => (
                          <li key={ti}>· {t}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Graduation Outcomes */}
            {inspectedProgramme.graduationOutcomes &&
              inspectedProgramme.graduationOutcomes.length > 0 && (
                <div className="bg-[#111111] text-white p-6 space-y-3">
                  <div className="text-xs font-mono font-semibold text-[#F9501E]">
                    GRADUATION CAPABILITIES &amp; PORTFOLIO OUTCOMES
                  </div>
                  <ul className="space-y-2 text-sm text-neutral-200">
                    {inspectedProgramme.graduationOutcomes.map((out, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#F9501E] shrink-0 mt-0.5" />
                        <span>{out}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            <div className="border-t border-neutral-200 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-neutral-600">
                Submitting an application is free. Admissions reviews applications prior to
                Proforma Invoice issuance.
              </div>
              <button
                type="button"
                onClick={() => openApplyFor(inspectedProgramme.id)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F9501E] text-white text-sm font-semibold hover:bg-[#d94316] shrink-0"
              >
                Apply for {inspectedProgramme.title}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
