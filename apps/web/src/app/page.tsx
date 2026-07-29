import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Sparkles } from "lucide-react";
import {
  AnalyticsMock,
  CampaignsListMock,
  CreatorMock,
  DashboardMock,
  PostInsightsMock,
  RosterMock,
} from "@/components/marketing/visuals";

export const metadata: Metadata = {
  title: "CCOS — The operating system for influencer campaigns",
  description:
    "Campaign operations, influencer CRM and performance intelligence in one system. Import your sheet, export it back anytime.",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2";

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-lg font-bold uppercase tracking-[0.12em] text-teal sm:text-xl">
      {children}
    </p>
  );
}

/** Short keyword chips — the detail, without the paragraph. */
function Chips({ items }: { items: string[] }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((c) => (
        <span
          key={c}
          className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-navy"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

/**
 * Hand-drawn-style curve linking one step to the next, following the zig-zag of
 * the alternating layout. Decorative, so it's dropped on narrow screens where
 * the steps stack in a single column.
 */
function StepArrow({ toRight }: { toRight: boolean }) {
  const path = toRight
    ? "M 200 6 C 200 92, 800 38, 800 108"
    : "M 800 6 C 800 92, 200 38, 200 108";
  const tipX = toRight ? 800 : 200;

  return (
    <div aria-hidden className="hidden lg:block">
      <svg
        viewBox="0 0 1000 130"
        preserveAspectRatio="none"
        className="h-28 w-full text-navy/20"
        fill="none"
      >
        <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d={`M ${tipX - 9} 96 L ${tipX} 110 L ${tipX + 9} 96`}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** One numbered step: copy on one side, the screen you'd actually see on the other. */
function Step({
  n,
  title,
  line,
  chips,
  visual,
  flip = false,
}: {
  n: string;
  title: string;
  line: string;
  chips: string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? "lg:order-2" : undefined}>
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-semibold text-primary-foreground">
            {n}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <h3 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-navy sm:text-4xl">
          {title}
        </h3>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{line}</p>
        <Chips items={chips} />
      </div>
      <div className={flip ? "lg:order-1" : undefined}>{visual}</div>
    </div>
  );
}

/** What the sheet loses the day the campaign ends. */
const FORGETS = [
  "creator history",
  "standard metric names",
  "CPV, CPM, ROAS",
  "cross-campaign view",
  "who closed whom",
  "last quarter's learnings",
];

const AUDIENCES = [
  {
    role: "Marketing managers",
    pain: "“I rebuild the same deck every month.”",
    fix: "Budget, ROAS and CPV, already in your export format.",
  },
  {
    role: "Influencer marketing teams",
    pain: "“We paid more than last time and didn't know.”",
    fix: "Every creator's cost and result, carried forward.",
  },
  {
    role: "Brands & D2C",
    pain: "“The agency sends a new Excel every campaign.”",
    fix: "One upload, matched and tagged by who closed them.",
  },
];

const PRINCIPLES = [
  ["Manual first", "never blocked by an API"],
  ["History kept", "nothing is ever destroyed"],
  ["Attributed", "every number names its source"],
  ["Always current", "KPIs recompute themselves"],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-50 border-b border-navy/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-6">
          <Link href="/" aria-label="CCOS home" className={`rounded-md ${focusRing}`}>
            <Image
              src="/logo-wordmark.png"
              alt="CCOS"
              width={590}
              height={188}
              priority
              className="h-7 w-auto"
            />
          </Link>
          <nav className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a className={`rounded hover:text-navy ${focusRing}`} href="#how">
              How it works
            </a>
            <a className={`rounded hover:text-navy ${focusRing}`} href="#who">
              Who it&apos;s for
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/sign-in"
              className={`rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-accent ${focusRing}`}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={`rounded-md bg-navy px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-navy/90 ${focusRing}`}
            >
              Join the Private Beta
            </Link>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-navy">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-teal/25 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-20 pt-20 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky/30 bg-white/5 px-3 py-1 text-xs font-medium text-sky">
              <Sparkles className="size-3.5" />
              Creator Campaign Operating System
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Your creator campaigns
              <br className="hidden sm:block" /> deserve better than a{" "}
              <span className="text-amber">spreadsheet</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-sky">
              Campaign ops, creator CRM and performance intelligence — one system.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className={`inline-flex h-11 items-center gap-2 rounded-md bg-amber px-6 text-sm font-semibold text-navy transition-colors hover:bg-orange ${focusRing} focus-visible:ring-offset-navy`}
              >
                Join the Private Beta
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sign-in"
                className={`inline-flex h-11 items-center rounded-md border border-sky/40 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10 ${focusRing} focus-visible:ring-offset-navy`}
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs text-sky/70">
              Import your sheet. Export it back anytime.
            </p>
          </div>

          <div className="mt-14">
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- problem */}
      <Section className="border-b border-border">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl">
            The sheet works — until the campaign ends.
          </h2>

          <p className="mt-10 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            What the sheet doesn&apos;t remember
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {FORGETS.map((f, i) => (
              <span key={f} className="flex items-center gap-3">
                {i > 0 ? (
                  <span aria-hidden className="text-navy/25">
                    ·
                  </span>
                ) : null}
                <span className="text-lg font-medium text-navy/70">{f}</span>
              </span>
            ))}
          </div>

          <p className="mt-12 text-base text-muted-foreground">
            Not a discovery tool. Not a HypeAuditor alternative.{" "}
            <strong className="font-semibold text-navy">
              The operations layer for the creators you already work with.
            </strong>
          </p>
        </div>
      </Section>

      {/* --------------------------------------------------------------- how */}
      <Section>
        <div id="how" className="scroll-mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Kickoff to reporting, in four steps
            </h2>
          </div>

          <div className="mt-16">
            <Step
              n="01"
              title="Create the campaign"
              line="Brand, budget, objective, dates. Every campaign is its own record — not another tab someone forgets to update."
              chips={["Budget & dates", "Draft → Active → Completed"]}
              visual={<CampaignsListMock />}
            />

            <StepArrow toRight={false} />

            <Step
              flip
              n="02"
              title="Add your creators"
              line="Pick them from your creator database, or drop in the agency's Excel. Cost and who closed them are recorded per campaign."
              chips={["Import agency roster", "Cost & closed by", "Deliverables"]}
              visual={<RosterMock />}
            />

            <StepArrow toRight />

            <Step
              n="03"
              title="Paste the live post"
              line="The link is all CCOS needs. Likes, comments and views sync from Instagram, and the actual CPV lands on the post."
              chips={["Auto-sync", "ER + actual CPV", "Manual always wins"]}
              visual={<PostInsightsMock />}
            />

            <StepArrow toRight={false} />

            <Step
              flip
              n="04"
              title="Read what worked"
              line="Rankings across every campaign you've run, with the summary already written up for you."
              chips={["ROAS & CPV rankings", "AI summary", "Excel export"]}
              visual={<AnalyticsMock />}
            />
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------ payoff */}
      <Section className="border-y border-border bg-muted/50">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Next campaign</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-navy sm:text-4xl">
              You already know who to call
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Every creator carries their history into the next negotiation — what
              they cost, what they returned, what your team wrote about them.
            </p>
            <Chips items={["Cross-campaign history", "Team notes", "Repeat candidates"]} />
          </div>
          <CreatorMock />
        </div>
      </Section>

      {/* --------------------------------------------------------------- who */}
      <Section>
        <div id="who" className="scroll-mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Who it&apos;s for</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              You&apos;ve said one of these out loud
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {AUDIENCES.map(({ role, pain, fix }) => (
              <div key={role} className="rounded-xl border border-border bg-card p-6">
                <p className="text-xl font-medium leading-snug text-navy">{pain}</p>
                <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                  {fix}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-teal">
                  {role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------- principles + xls */}
      <Section className="border-t border-border">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map(([title, body]) => (
            <div key={title} className="border-t-2 border-navy pt-4">
              <h3 className="text-base font-semibold text-navy">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-5 text-center sm:flex-row sm:text-left">
          <FileSpreadsheet className="size-5 shrink-0 text-teal" />
          <p className="text-base text-navy">
            <strong className="font-semibold">Your spreadsheet still works here.</strong>{" "}
            <span className="text-muted-foreground">
              Import creators and agency rosters; export the supply tracker your team
              already reads.
            </span>
          </p>
        </div>
      </Section>

      {/* --------------------------------------------------------------- cta */}
      <section className="bg-navy">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center sm:py-24">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Start with your next campaign.
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className={`inline-flex h-11 items-center gap-2 rounded-md bg-amber px-6 text-sm font-semibold text-navy transition-colors hover:bg-orange ${focusRing} focus-visible:ring-offset-navy`}
            >
              Join the Private Beta
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/sign-in"
              className={`inline-flex h-11 items-center rounded-md border border-sky/40 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10 ${focusRing} focus-visible:ring-offset-navy`}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Image
            src="/logo-wordmark.png"
            alt="CCOS"
            width={590}
            height={188}
            className="h-6 w-auto"
          />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link className={`rounded hover:text-navy ${focusRing}`} href="/privacy-policy">
              Privacy Policy
            </Link>
            <Link className={`rounded hover:text-navy ${focusRing}`} href="/terms-of-service">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
