import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { cohorts, instituteSettings, programmes } from '../db/schema.ts';

let seedPromise: Promise<void> | null = null;

interface SeedProgrammeBlueprint {
  code: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  learningObjectives: string[];
  skillsAcquired: string[];
  modules: { title: string; duration: string; topics: string[] }[];
  weeklyDeliverables: {
    weekNumber: number;
    title: string;
    sessionCommitment: string;
    learn: string[];
    practise: string[];
    produce: string;
  }[];
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

const PROGRAMME_BLUEPRINTS: SeedProgrammeBlueprint[] = [
  {
    code: 'ARTI-PROG-01',
    slug: 'ai-application-development',
    title: 'AI Application Development',
    summary:
      'Build and deploy functional AI-powered web and mobile applications from scratch on laptop or smartphone.',
    description:
      'A structured three-week practical programme teaching participants how to architect interfaces, integrate persistent databases and APIs, embed real AI workflows, and deploy working digital applications online.',
    learningObjectives: [
      'Structure interactive application screens using modern AI coding workflows',
      'Connect user interfaces to persistent PostgreSQL databases and server APIs',
      'Integrate real AI APIs, structured outputs, and user authentication',
      'Test, debug, and deploy a working application to a live URL',
    ],
    skillsAcquired: [
      'AI-Assisted App Engineering',
      'Component Architecture',
      'Database Connectivity',
      'REST API Integration',
      'Cloud Deployment',
    ],
    modules: [
      {
        title: 'Week 01: Idea to First Build',
        duration: '3 Sessions / 9 Hours',
        topics: [
          'Development environment setup (Laptop or Mobile-first)',
          'Translating product specs into clean UI layouts',
          'Interactive screen flows and state management',
        ],
      },
      {
        title: 'Week 02: Make It Work',
        duration: '3 Sessions / 9 Hours',
        topics: [
          'Database modelling and CRUD endpoints',
          'Integrating AI models and structured prompts',
          'User authentication and form validation',
        ],
      },
      {
        title: 'Week 03: Launch It Live',
        duration: '3 Sessions / 9 Hours',
        topics: [
          'End-to-end debugging and error handling',
          'Production build and live cloud deployment',
          'Practical evaluation and product walkthrough',
        ],
      },
    ],
    weeklyDeliverables: [
      {
        weekNumber: 1,
        title: 'Week 1 — Product Blueprint & Core Application Interface',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Development setup on laptop or smartphone cloud IDE',
          'Scoping real user problems into structured screen flows',
        ],
        practise: [
          'Prompt-assisted UI engineering and responsive layout composition',
          'Building multi-view navigation and validated input forms',
        ],
        produce: 'Working interactive application prototype with core user screens.',
      },
      {
        weekNumber: 2,
        title: 'Week 2 — Data Persistence, APIs & AI Logic',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Relational database schemas and server API routing',
          'Connecting server-side AI endpoints and structured JSON responses',
        ],
        practise: [
          'Persisting user records and querying live backend endpoints',
          'Implementing error states, role checks, and AI workflow triggers',
        ],
        produce: 'Database-connected application with functional AI workflows.',
      },
      {
        weekNumber: 3,
        title: 'Week 3 — Testing, Hardening & Production Launch',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Capstone Review',
        learn: [
          'Production environment configuration and security hygiene',
          'Debugging live workflows and preparing a client-ready demo',
        ],
        practise: [
          'Running TypeScript/build checks and fixing edge-case failures',
          'Deploying to a live public URL and documenting project architecture',
        ],
        produce: 'Live deployed AI application ready for portfolio or business use.',
      },
    ],
    graduationOutcomes: [
      'Architect and ship a database-backed AI application from concept to live URL.',
      'Manage full-stack development workflows using Google AI Studio, GitHub, and modern IDEs.',
      'Graduate with a deployed project and portfolio-ready technical demonstration.',
    ],
    sessionSchedule: '3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)',
    durationText: '3 Weeks (27 Practical Hours)',
    durationWeeks: 3,
    deliveryFormat: 'Hybrid',
    weeklyFeeAmount: 430000,
    feeAmount: 1290000,
    allowsInstalments: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'ARTI-PROG-02',
    slug: 'ai-powered-website-development',
    title: 'AI-Powered Website Development',
    summary:
      'Design, engineer, and launch responsive commercial websites and customer portals using AI-assisted workflows.',
    description:
      'Focused on building responsive, credible business websites, lead-capture portals, and dynamic web platforms using structured typography, clean layout engineering, backend forms, and live hosting.',
    learningObjectives: [
      'Structure clean editorial and commercial website architectures',
      'Build responsive layouts optimised for mobile and desktop viewports',
      'Connect inquiry, booking, and lead-capture forms to live backends',
      'Publish and maintain production websites with custom domains and SEO basics',
    ],
    skillsAcquired: [
      'Responsive Web Layout',
      'AI-Assisted Frontend Engineering',
      'Lead Capture & Validation',
      'Web Hosting & SEO Basics',
    ],
    modules: [
      {
        title: 'Week 01: Layout & Brand Systems',
        duration: '3 Sessions / 9 Hours',
        topics: ['Brand typography', 'Mobile-first grids', 'Hero & conversion sections'],
      },
      {
        title: 'Week 02: Dynamic Pages & Backend Forms',
        duration: '3 Sessions / 9 Hours',
        topics: ['Dynamic components', 'Form validation & API submission', 'Database storage'],
      },
      {
        title: 'Week 03: Production Launch & Handover',
        duration: '3 Sessions / 9 Hours',
        topics: ['Performance optimization', 'Live deployment & meta tags', 'Client walkthrough'],
      },
    ],
    weeklyDeliverables: [
      {
        weekNumber: 1,
        title: 'Week 1 — Visual System & Responsive Page Architecture',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Commercial page hierarchy, colour contrast, and typography pairing',
          'Structuring mobile-first grids that adapt cleanly to desktop screens',
        ],
        practise: [
          'Building navigation bars, service sections, and structured pricing tables',
          'Integrating high-clarity brand media and fallback containers',
        ],
        produce: 'Multi-section responsive brand website layout.',
      },
      {
        weekNumber: 2,
        title: 'Week 2 — Interactive Components & Backend Lead Capture',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Client-side form validation and API request handling',
          'Persisting inquiries, bookings, and dynamic catalogue items',
        ],
        practise: [
          'Connecting contact/application forms to PostgreSQL endpoints',
          'Building interactive modals, status lookups, and admin-editable copy',
        ],
        produce: 'Dynamic web portal with live form submissions and database persistence.',
      },
      {
        weekNumber: 3,
        title: 'Week 3 — SEO, Verification & Live Deployment',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Capstone Review',
        learn: [
          'Metadata, OpenGraph sharing cards, and cross-device QA checks',
          'Production bundling, domain mapping, and handover documentation',
        ],
        practise: [
          'Eliminating broken asset links and verifying production builds',
          'Deploying the finished website live and presenting the final build',
        ],
        produce: 'Published commercial website live online for real visitors.',
      },
    ],
    graduationOutcomes: [
      'Design and deploy responsive business websites and client portals independently.',
      'Wire validated inquiry and booking workflows directly to a backend database.',
      'Graduate with a live, portfolio-ready web platform.',
    ],
    sessionSchedule: '3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)',
    durationText: '3 Weeks (27 Practical Hours)',
    durationWeeks: 3,
    deliveryFormat: 'Hybrid',
    weeklyFeeAmount: 430000,
    feeAmount: 1290000,
    allowsInstalments: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    code: 'ARTI-PROG-03',
    slug: 'mobile-application-development',
    title: 'Mobile Application Development',
    summary:
      'Create functional mobile-first web and cross-platform apps for commerce, services, and operations—even starting from your phone.',
    description:
      'Hands-on 3-week training covering thumb-friendly mobile UX patterns, order/inventory apps, authentication, notifications, and cloud deployment for Android, iOS, and mobile browsers.',
    learningObjectives: [
      'Design thumb-friendly mobile navigation and touch workflows',
      'Build multi-screen mobile apps with real data persistence',
      'Implement user authentication and role-based mobile views',
      'Deploy mobile-ready applications accessible to real users',
    ],
    skillsAcquired: [
      'Mobile-First UI/UX',
      'Data Persistence & APIs',
      'Mobile Authentication',
      'App Deployment',
    ],
    modules: [
      {
        title: 'Week 01: Mobile Architecture & Screens',
        duration: '3 Sessions / 9 Hours',
        topics: ['Touch-first layouts', 'Bottom/drawer navigation', 'Core screens'],
      },
      {
        title: 'Week 02: Data, Orders & Authentication',
        duration: '3 Sessions / 9 Hours',
        topics: ['User sign-in', 'Real-time orders & records', 'Validation'],
      },
      {
        title: 'Week 03: Device Testing & Release',
        duration: '3 Sessions / 9 Hours',
        topics: ['Mobile viewport testing', 'Cloud deployment', 'Live demo'],
      },
    ],
    weeklyDeliverables: [
      {
        weekNumber: 1,
        title: 'Week 1 — Mobile UX & Multi-Screen Navigation',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Touch-target ergonomics and mobile viewport constraints',
          'Structuring clean multi-tab mobile interfaces',
        ],
        practise: [
          'Building core mobile screens and bottom/drawer navigation',
          'Testing layouts directly across smartphone viewports',
        ],
        produce: 'Interactive mobile-first multi-screen application shell.',
      },
      {
        weekNumber: 2,
        title: 'Week 2 — User Accounts, Orders & Backend Sync',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Mobile session authentication and user-scoped data queries',
          'Handling bookings, orders, or service requests reliably',
        ],
        practise: [
          'Integrating backend APIs for real-time record creation and status tracking',
          'Adding clean loading, empty, and validation feedback states',
        ],
        produce: 'Working mobile app connected to user authentication and database storage.',
      },
      {
        weekNumber: 3,
        title: 'Week 3 — Cross-Device QA & Live Release',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Capstone Review',
        learn: [
          'Installable web app manifests, caching basics, and mobile QA',
          'Preparing operational user flows for live customers',
        ],
        practise: [
          'End-to-end mobile testing across Android and iOS browsers',
          'Publishing the mobile app to a live HTTPS endpoint',
        ],
        produce: 'Live mobile-first application tested on real smartphones.',
      },
    ],
    graduationOutcomes: [
      'Build responsive, touch-optimised mobile applications from laptop or smartphone.',
      'Implement authenticated customer workflows with persistent backend records.',
      'Graduate with a live, smartphone-tested digital product.',
    ],
    sessionSchedule: '3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)',
    durationText: '3 Weeks (27 Practical Hours)',
    durationWeeks: 3,
    deliveryFormat: 'Online live sessions',
    weeklyFeeAmount: 430000,
    feeAmount: 1290000,
    allowsInstalments: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    code: 'ARTI-PROG-04',
    slug: 'ai-agents-and-automation',
    title: 'AI Agents and Automation',
    summary:
      'Architect practical AI agents, customer workflow bots, and business process automations connected to real APIs.',
    description:
      'Learn how to connect language models, webhooks, APIs, and operational databases to automate repetitive operational tasks, reporting, and multi-step customer workflows with clear guardrails.',
    learningObjectives: [
      'Design reliable tool-calling and structured AI workflows',
      'Connect webhooks, notifications, databases, and external APIs cleanly',
      'Implement input validation, error handling, and human-in-the-loop approvals',
      'Deploy practical automation services for real business operations',
    ],
    skillsAcquired: [
      'Agent Workflow Design',
      'Webhook & API Orchestration',
      'Process Automation',
      'Structured AI Outputs',
    ],
    modules: [
      {
        title: 'Week 01: Foundations of AI Automation',
        duration: '3 Sessions / 9 Hours',
        topics: ['APIs & webhooks', 'Structured prompting', 'Task decomposition'],
      },
      {
        title: 'Week 02: Building Tool-Using Workflows',
        duration: '3 Sessions / 9 Hours',
        topics: ['Function calling', 'Database & notification triggers', 'Error handling'],
      },
      {
        title: 'Week 03: Guardrails & Production Deployment',
        duration: '3 Sessions / 9 Hours',
        topics: ['Human review gates', 'Audit logging', 'Live automation launch'],
      },
    ],
    weeklyDeliverables: [
      {
        weekNumber: 1,
        title: 'Week 1 — Automation Mapping & API Foundations',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Breaking manual business processes into trigger-action steps',
          'Working with JSON payloads, webhooks, and REST APIs',
        ],
        practise: [
          'Creating structured AI prompt templates with predictable outputs',
          'Testing API endpoints and webhook receivers locally',
        ],
        produce: 'Documented automation blueprint and working webhook service.',
      },
      {
        weekNumber: 2,
        title: 'Week 2 — Tool-Calling Agents & Data Routing',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Connecting AI functions to database reads/writes and notifications',
          'Designing safe fallback paths when external APIs fail',
        ],
        practise: [
          'Implementing automated lead triage, reminders, or support routing',
          'Persisting execution logs for administrative visibility',
        ],
        produce: 'Functional multi-step AI automation connected to live data.',
      },
      {
        weekNumber: 3,
        title: 'Week 3 — Verification Controls & Live Operations',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Capstone Review',
        learn: [
          'Adding human approval checkpoints for sensitive actions',
          'Securing API keys on the server side and deploying services',
        ],
        practise: [
          'Testing end-to-end automation reliability with real inputs',
          'Deploying the service online with clear operational controls',
        ],
        produce: 'Production-deployed AI automation tool with human-in-the-loop review.',
      },
    ],
    graduationOutcomes: [
      'Design and ship API-connected automation workflows with real guardrails.',
      'Integrate structured AI reasoning into everyday business operations.',
      'Graduate with a working, auditable automation system.',
    ],
    sessionSchedule: '3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)',
    durationText: '3 Weeks (27 Practical Hours)',
    durationWeeks: 3,
    deliveryFormat: 'Hybrid',
    weeklyFeeAmount: 430000,
    feeAmount: 1290000,
    allowsInstalments: true,
    isActive: true,
    sortOrder: 4,
  },
  {
    code: 'ARTI-PROG-05',
    slug: 'full-stack-ai-product-development',
    title: 'Full-Stack AI Product Development',
    summary:
      'End-to-end engineering of multi-role web platforms with PostgreSQL, authentication, billing workflows, and AI features.',
    description:
      'An intensive three-week full-stack engineering track covering relational database modelling, secure REST APIs, role-based portals, payment verification flows, and live cloud deployment.',
    learningObjectives: [
      'Model relational PostgreSQL databases with strict referential integrity',
      'Build secure Express server APIs with authentication and RBAC',
      'Develop cohesive multi-role React applications for users and admins',
      'Ship a complete full-stack digital product with TypeScript and clean deployment',
    ],
    skillsAcquired: [
      'Full-Stack TypeScript',
      'PostgreSQL & Drizzle ORM',
      'Authentication & RBAC',
      'Payment & Document Workflows',
      'Production Deployment',
    ],
    modules: [
      {
        title: 'Week 01: Product Architecture & Frontend Systems',
        duration: '3 Sessions / 9 Hours',
        topics: ['System design', 'Typed React components', 'Validated workflows'],
      },
      {
        title: 'Week 02: PostgreSQL, Auth & Server APIs',
        duration: '3 Sessions / 9 Hours',
        topics: ['Relational schemas', 'Authenticated REST routes', 'Role-based controls'],
      },
      {
        title: 'Week 03: Billing, Testing & Production Launch',
        duration: '3 Sessions / 9 Hours',
        topics: ['Payment & PDF integrations', 'Production build checks', 'Live launch'],
      },
    ],
    weeklyDeliverables: [
      {
        weekNumber: 1,
        title: 'Week 1 — System Architecture & Typed Frontend Core',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Full-stack application boundaries and relational domain modelling',
          'Building structured React views with TypeScript interfaces',
        ],
        practise: [
          'Implementing multi-step forms, data tables, and responsive layouts',
          'Managing authenticated application state cleanly',
        ],
        produce: 'Structured frontend architecture connected to typed domain models.',
      },
      {
        weekNumber: 2,
        title: 'Week 2 — PostgreSQL Persistence & Role-Based APIs',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Guided Practice',
        learn: [
          'Designing relational tables, foreign keys, and transactional updates',
          'Enforcing authentication middleware and role permissions on routes',
        ],
        practise: [
          'Writing Drizzle ORM queries and Express endpoints',
          'Connecting user portals and administrative consoles to live data',
        ],
        produce: 'Authenticated backend API backed by live PostgreSQL tables.',
      },
      {
        weekNumber: 3,
        title: 'Week 3 — Operational Workflows, QA & Live Release',
        sessionCommitment: '3 Sessions · 9 Practical Hours + Capstone Review',
        learn: [
          'Integrating payment webhooks, document generation, and audit trails',
          'Executing TypeScript checks and production Vite builds',
        ],
        practise: [
          'Testing end-to-end user and administrator flows',
          'Deploying the full-stack application to a live cloud URL',
        ],
        produce: 'Complete, deployed full-stack platform with user and admin portals.',
      },
    ],
    graduationOutcomes: [
      'Design relational PostgreSQL schemas and secure role-based server APIs.',
      'Deliver full-stack TypeScript web products with real operational workflows.',
      'Graduate with a production-deployed multi-role capstone application.',
    ],
    sessionSchedule: '3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)',
    durationText: '3 Weeks (27 Practical Hours)',
    durationWeeks: 3,
    deliveryFormat: 'Hybrid',
    weeklyFeeAmount: 430000,
    feeAmount: 1290000,
    allowsInstalments: true,
    isActive: true,
    sortOrder: 5,
  },
  {
    code: 'ARTI-PROG-06',
    slug: 'specialised-technology-training',
    title: 'Specialised Technology Training',
    summary:
      'Customised executive, robotics, or team technical upskilling structured around real organisational workflows.',
    description:
      'Targeted practical technology training designed for teams, founders, schools, and organisations seeking structured capability in AI systems, software prototyping, or internal digital tooling.',
    learningObjectives: [
      'Audit existing operational workflows for practical software and AI adoption',
      'Train participants on structured AI and software engineering tooling',
      'Deliver a working internal proof-of-concept tailored to organisational needs',
    ],
    skillsAcquired: [
      'Applied Systems Design',
      'Team AI Enablement',
      'Rapid Prototyping',
    ],
    modules: [
      {
        title: 'Week 01: Technical Audit & Prototype Foundations',
        duration: '3 Sessions / 9 Hours',
        topics: ['Workflow discovery', 'Tooling setup', 'Initial prototype'],
      },
      {
        title: 'Week 02: Core System Integration',
        duration: '3 Sessions / 9 Hours',
        topics: ['Database & API wiring', 'Team workflow implementation'],
      },
      {
        title: 'Week 03: Deployment & Team Handover',
        duration: '3 Sessions / 9 Hours',
        topics: ['Live deployment', 'Documentation & operational handover'],
      },
    ],
    weeklyDeliverables: [
      {
        weekNumber: 1,
        title: 'Week 1 — Workflow Audit & Prototype Scope',
        sessionCommitment: '3 Sessions · 9 Practical Hours (or Custom Schedule)',
        learn: [
          'Identifying high-impact automation and software opportunities',
          'Aligning team devices and cloud tooling safely',
        ],
        practise: [
          'Drafting technical specifications and initial screen prototypes',
        ],
        produce: 'Scoped implementation roadmap and working interface prototype.',
      },
      {
        weekNumber: 2,
        title: 'Week 2 — Hands-On Build & Data Wiring',
        sessionCommitment: '3 Sessions · 9 Practical Hours (or Custom Schedule)',
        learn: [
          'Connecting organisational data sources and AI tools securely',
        ],
        practise: [
          'Building core custom features with guided instructor code reviews',
        ],
        produce: 'Working internal software or AI proof-of-concept.',
      },
      {
        weekNumber: 3,
        title: 'Week 3 — Testing, Launch & Handover',
        sessionCommitment: '3 Sessions · 9 Practical Hours (or Custom Schedule)',
        learn: [
          'Operational maintenance, governance, and team onboarding practices',
        ],
        practise: [
          'Deploying the prototype and training team stakeholders on daily use',
        ],
        produce: 'Deployed bespoke prototype with handover documentation.',
      },
    ],
    graduationOutcomes: [
      'Translate an organisational workflow bottleneck into a functional software prototype.',
      'Equip team members with practical skills to maintain and extend internal tools.',
    ],
    sessionSchedule: '3 Sessions / Week · 3 Hours / Session (Customisable for Teams)',
    durationText: '3 Weeks (27 Practical Hours / Customisable)',
    durationWeeks: 3,
    deliveryFormat: 'In-person',
    weeklyFeeAmount: 430000,
    feeAmount: 1290000,
    allowsInstalments: true,
    isActive: true,
    sortOrder: 6,
  },
];

export async function ensureInitialSeed(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const existingSettings = await db
        .select()
        .from(instituteSettings)
        .where(eq(instituteSettings.key, 'default'))
        .limit(1);

      if (existingSettings.length === 0) {
        await db.insert(instituteSettings).values({
          key: 'default',
          instituteName: 'ARTDROBOTIX INSTITUTE',
          descriptor: 'SCHOOL OF ART, SCIENCE & TECHNOLOGY',
          tagline:
            'BUILD THE FUTURE. LEARN THE TECHNOLOGY. CREATE REAL-WORLD SOLUTIONS.',
          supportEmail: 'admissions@artdrobotix.edu.ng',
          whatsappNumbers: '0706 812 4439 | 0911 427 6223',
          address: 'Lagos, Nigeria — In-Person Studio & Live Online Campus',
          currency: 'NGN',
          bankName: 'Providus Bank (Configure Institutional Account)',
          accountName: 'Artdrobotix Institute',
          accountNumber: 'Pending Configuration',
          paymentInstructions:
            'Transfer the exact payable amount referencing your Proforma Invoice Number (e.g. ARTI-INV-2026-0001). Official receipts are issued strictly after administrative payment verification.',
          reminderHoursBeforeDue: 48,
          gracePeriodHours: 48,
          paymentPolicySummary:
            'Invoices are issued ahead of due dates for both Full Payment and Weekly Instalment plans. Payment reminders are dispatched approximately 48 hours before each deadline. A 48-hour grace period applies for genuine delays communicated with the Institute. Unverified transactions are never marked paid.',
          instructorName: 'Prince Anyanwu',
          instructorTitle:
            'AI Systems Engineer | Automation Architect | Product Builder',
          instructorBio:
            'Lead technical instructor and systems architect specialising in production AI applications, workflow automation pipelines, full-stack software engineering, and practical digital product deployment across mobile and desktop environments.',
          instructorPortfolioUrl: 'https://prince-anyanwu-portfolio.vercel.app',
          instructorGithubUrl: 'https://github.com',
          instructorLinkedinUrl: 'https://linkedin.com',
          onboardingTemplate: {
            scheduleNotes:
              'Sessions run 3 times weekly for 3 hours per session (27+ practical hours over 3 weeks). Punctuality and active hands-on participation are required.',
            softwareRequirements: [
              'Modern web browser (Google Chrome or Safari)',
              'Google AI Studio & ChatGPT accounts',
              'GitHub account for version control',
              'Visual Studio Code (for laptop-based development track)',
            ],
            hardwareRequirements: [
              'Laptop (Windows or MacBook, 8GB RAM minimum recommended) OR Smartphone (Android/iPhone) with reliable internet for mobile-first track',
              'Reliable broadband or stable mobile data connection',
            ],
            learningResources: [
              'Artdrobotix Student Portal — Course Modules & Resource Vault',
              'Weekly Practical Build Briefs & Deployment Checklists',
            ],
            communicationChannels:
              'Primary updates are delivered inside the Artdrobotix Student Portal and via official Institute email/WhatsApp channels (0706 812 4439 | 0911 427 6223).',
            assignmentExpectations:
              'Every module includes practical implementation tasks outside live sessions. Students must submit working links or repositories before deadlines to qualify for certification.',
            trainingPolicies:
              'Minimum 80% attendance, completion of practical assessments, and verified tuition settlement are required for certificate approval.',
          },
          notificationTemplates: {
            APPLICATION_RECEIVED: {
              subject: 'Artdrobotix Institute — Application Received',
              body: 'Your application has been received and logged for review. Keep your reference number safe to track your admission progress.',
            },
            APPLICATION_ACCEPTED: {
              subject: 'Artdrobotix Institute — Admission Offer & Next Steps',
              body: 'Congratulations. Your application has been accepted. Your Proforma Invoice and onboarding instructions will follow shortly.',
            },
            INVOICE_GENERATED: {
              subject: 'Artdrobotix Institute — Proforma Invoice Issued',
              body: 'A Proforma Invoice has been generated for your training programme. Please review the payment details and due date.',
            },
            PAYMENT_REMINDER: {
              subject: 'Artdrobotix Institute — Upcoming Instalment Payment Reminder',
              body: 'This is a 48-hour courtesy reminder ahead of your upcoming tuition deadline. Please settle your balance or reach out regarding the 48-hour grace policy if needed.',
            },
            PAYMENT_VERIFIED: {
              subject: 'Artdrobotix Institute — Payment Verified & Official Receipt',
              body: 'Your payment has been verified by our finance office and your official receipt has been issued.',
            },
            ADMISSION_CONFIRMED: {
              subject: 'Welcome to Artdrobotix Institute — Enrolment Confirmed',
              body: 'Your enrolment is confirmed. Your Student Admission Number and Student Portal access are now active.',
            },
            CERTIFICATE_ISSUED: {
              subject: 'Artdrobotix Institute — Official Certificate Issued',
              body: 'Congratulations on completing your programme. Your official verifiable certificate is now available in your Student Portal.',
            },
          },
        });
      }

      const existingProgs = await db.select().from(programmes);

      if (existingProgs.length === 0) {
        const seededProgrammes = await db
          .insert(programmes)
          .values(PROGRAMME_BLUEPRINTS)
          .returning();

        const firstProg = seededProgrammes[0];
        if (firstProg) {
          await db.insert(cohorts).values([
            {
              programmeId: firstProg.id,
              code: 'COH-2026-NOV-A',
              name: 'November 2026 Practical AI Cohort A',
              instructorName: 'Prince Anyanwu',
              deliveryFormat: 'Hybrid',
              scheduleText: 'Mon / Wed / Fri · 6:00 PM – 9:00 PM WAT',
              startDate: '2026-11-23',
              endDate: '2026-12-14',
              capacity: 25,
              status: 'UPCOMING',
            },
            {
              programmeId: seededProgrammes[4]?.id ?? firstProg.id,
              code: 'COH-2026-DEC-FS',
              name: 'December 2026 Full-Stack AI Cohort',
              instructorName: 'Prince Anyanwu',
              deliveryFormat: 'Hybrid',
              scheduleText: 'Tue / Thu / Sat · 5:00 PM – 8:00 PM WAT',
              startDate: '2026-12-01',
              endDate: '2026-12-22',
              capacity: 20,
              status: 'UPCOMING',
            },
          ]);
        }
      } else {
        // Idempotent migration for existing seeded programmes lacking weeklyDeliverables
        for (const existing of existingProgs) {
          const hasDeliverables =
            Array.isArray(existing.weeklyDeliverables) &&
            existing.weeklyDeliverables.length > 0;
          if (!hasDeliverables) {
            const blueprint = PROGRAMME_BLUEPRINTS.find(
              (b) => b.code === existing.code || b.slug === existing.slug
            );
            if (blueprint) {
              await db
                .update(programmes)
                .set({
                  summary: blueprint.summary,
                  description: blueprint.description,
                  learningObjectives: blueprint.learningObjectives,
                  skillsAcquired: blueprint.skillsAcquired,
                  modules: blueprint.modules,
                  weeklyDeliverables: blueprint.weeklyDeliverables,
                  graduationOutcomes: blueprint.graduationOutcomes,
                  sessionSchedule: blueprint.sessionSchedule,
                  durationText: blueprint.durationText,
                  durationWeeks: blueprint.durationWeeks,
                  weeklyFeeAmount: blueprint.weeklyFeeAmount,
                  feeAmount: blueprint.feeAmount,
                  allowsInstalments: blueprint.allowsInstalments,
                  updatedAt: new Date(),
                })
                .where(eq(programmes.id, existing.id));
            }
          }
        }
      }
    } catch (err) {
      seedPromise = null;
      console.error('Initial seed error:', err);
      throw err;
    }
  })();

  return seedPromise;
}
