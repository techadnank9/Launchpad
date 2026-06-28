import Link from "next/link";
import type { ReactNode } from "react";
import { SiteNav } from "./SiteNav";

const FLOW_STEPS = [
  {
    id: "input",
    phase: "Input",
    title: "Paste your URL",
    body: "One URL is all Launchpad needs. We normalize the domain and create a GTM run instantly.",
    tags: ["Next.js UI", "Convex"],
  },
  {
    id: "analyst",
    phase: "Analyze",
    title: "Site Analyst",
    body: "Scrapes your site, extracts brand kit (colors, tagline, visual style), and detects 3–5 buyer personas with GPT-4o.",
    tags: ["Scraper", "GPT-4o", "Site memory"],
    highlight: "Merges with remembered personas if you've run this domain before.",
  },
  {
    id: "fanout",
    phase: "Parallel",
    title: "One pipeline per persona",
    body: "Each persona gets its own outbound + inbound pipeline. All personas run in parallel.",
    tags: ["Convex scheduler"],
    fanOut: true,
  },
] as const;

const PERSONA_PIPELINE = [
  {
    title: "Lead Agent",
    body: "Fiber AI finds leads. Orange Slice scores intent. Top leads get discovery meetings on your calendar.",
    tags: ["Fiber AI", "Orange Slice"],
    outputs: ["Lead list", "Pipeline stages", "Meetings"],
  },
  {
    title: "Copy Agent",
    body: "GPT-4o writes a multi-touch cold email sequence tailored to the persona's pain points.",
    tags: ["GPT-4o"],
    outputs: ["Outbound emails"],
  },
  {
    title: "Poster Agent",
    body: "Generates a branded social poster and caption using your extracted brand kit.",
    tags: ["GPT-4o", "Image gen"],
    outputs: ["Poster", "Caption"],
  },
  {
    title: "Scheduler Agent",
    body: "Queues posts across LinkedIn, X, and Instagram with staggered dates per persona.",
    tags: ["Postiz optional"],
    outputs: ["Content calendar"],
  },
] as const;

const OUTPUTS = [
  {
    title: "GTM Dashboard",
    href: "/",
    description: "Personas, leads, emails, posters, and approve actions in one view.",
  },
  {
    title: "Pipeline Board",
    href: "/how-it-works#pipeline",
    description: "Monaco-style kanban — Discovery → Nurture → Proposal → Closed Won.",
  },
  {
    title: "Content Calendar",
    href: "/how-it-works#calendar",
    description: "Posts and meetings on a shared schedule, grouped by persona.",
  },
] as const;

export function PlatformFlowPage() {
  return (
    <div className="min-h-screen">
      <SiteNav showClientSwitcher />

      <main className="app-shell py-12 sm:py-16">
        <header className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#52525b]">
            Platform architecture
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[#0a0a0a] sm:text-5xl">
            How Launchpad works
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[#3f3f46]">
            From a single URL to outbound pipelines, inbound content, and a live
            revenue calendar — every integration fires in a coordinated flow.
          </p>
        </header>

        <div className="mt-14">
          <FlowSection title="The main flow">
            <div className="flex flex-col items-center">
              {FLOW_STEPS.map((step, i) => (
                <div key={step.id} className="flex w-full max-w-2xl flex-col items-center">
                  <FlowNode
                    phase={step.phase}
                    title={step.title}
                    body={step.body}
                    tags={[...step.tags]}
                    highlight={"highlight" in step ? step.highlight : undefined}
                    fanOut={"fanOut" in step && step.fanOut}
                  />
                  {i < FLOW_STEPS.length - 1 && <FlowArrow />}
                </div>
              ))}

              <div className="relative mt-2 w-full max-w-4xl">
                <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wide text-[#52525b]">
                  Per persona (runs in parallel)
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {PERSONA_PIPELINE.map((step, i) => (
                    <div key={step.title} className="relative">
                      {i === 0 && (
                        <div className="absolute -top-6 left-1/2 hidden h-6 w-px -translate-x-1/2 bg-[#d4d4cc] md:block" />
                      )}
                      <PipelineNode {...step} step={i + 1} />
                      {i < PERSONA_PIPELINE.length - 1 && (
                        <div className="mx-auto my-2 flex justify-center md:hidden">
                          <FlowArrow short />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mx-auto mt-6 flex justify-center">
                  <FlowArrow />
                </div>
              </div>

              <div className="mt-2 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
                {OUTPUTS.map((out) => (
                  <OutputNode key={out.title} {...out} />
                ))}
              </div>
            </div>
          </FlowSection>

          <FlowSection title="Site memory" className="mt-16">
            <div className="surface rounded-2xl p-6 sm:p-8">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl text-[#0a0a0a]">
                    Runs remember your clients
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#3f3f46]">
                    Every domain gets a persistent site profile. Re-run the same
                    URL and Launchpad merges new GPT analysis with cached personas
                    and leads — no duplicate work, smarter every time.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 text-sm">
                  <MemoryNode label="First run" sub="Analyze · save to DB" />
                  <FlowArrow short />
                  <MemoryNode label="Second run" sub="Merge personas + leads" active />
                  <FlowArrow short />
                  <MemoryNode label="Client switcher" sub="Jump between sites" />
                </div>
              </div>
            </div>
          </FlowSection>

          <FlowSection title="Integrations" className="mt-16">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {INTEGRATIONS.map((item) => (
                <div
                  key={item.name}
                  className="surface rounded-xl px-4 py-4"
                >
                  <p className="text-sm font-semibold text-[#0a0a0a]">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#52525b]">
                    {item.role}
                  </p>
                </div>
              ))}
            </div>
          </FlowSection>

          <div className="mt-16 rounded-2xl border border-[#d4d4cc] bg-[#ecece7]/50 px-6 py-10 text-center sm:px-12">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0a0a0a]">
              Ready to see it live?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#3f3f46]">
              Paste a URL on the home page and watch the flow execute in real time.
            </p>
            <Link
              href="/"
              className="btn-primary mt-6 inline-block rounded-md px-6 py-3 text-sm font-medium"
            >
              Launch GTM
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

const INTEGRATIONS = [
  { name: "GPT-4o", role: "Personas, emails, captions, brand analysis" },
  { name: "Fiber AI", role: "Lead discovery by persona" },
  { name: "Orange Slice", role: "Intent scoring + signals" },
  { name: "Postiz", role: "Optional social scheduling" },
] as const;

function FlowSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="mb-8 font-[family-name:var(--font-display)] text-2xl text-[#0a0a0a]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FlowNode({
  phase,
  title,
  body,
  tags,
  highlight,
  fanOut,
}: {
  phase: string;
  title: string;
  body: string;
  tags: string[];
  highlight?: string;
  fanOut?: boolean;
}) {
  return (
    <div
      className={`surface w-full rounded-2xl px-5 py-5 sm:px-6 ${
        fanOut ? "border-violet-200 bg-violet-50/50" : ""
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#52525b]">
        {phase}
      </p>
      <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[#0a0a0a]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#3f3f46]">{body}</p>
      {highlight && (
        <p className="mt-2 text-xs font-medium text-violet-900">{highlight}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Tag key={tag} label={tag} />
        ))}
      </div>
      {fanOut && (
        <p className="mt-3 text-center text-xs text-violet-800">
          ↓ splits into N parallel persona pipelines ↓
        </p>
      )}
    </div>
  );
}

function PipelineNode({
  title,
  body,
  tags,
  outputs,
  step,
}: {
  title: string;
  body: string;
  tags: readonly string[];
  outputs: readonly string[];
  step: number;
}) {
  return (
    <div className="surface h-full rounded-xl px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0a0a0a] text-xs font-semibold text-white">
          {step}
        </span>
        <h4 className="font-medium text-[#0a0a0a]">{title}</h4>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#3f3f46]">{body}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Tag key={tag} label={tag} small />
        ))}
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-[#52525b]">
        Outputs
      </p>
      <ul className="mt-1 space-y-0.5">
        {outputs.map((o) => (
          <li key={o} className="text-xs text-[#3f3f46]">
            → {o}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OutputNode({
  title,
  description,
}: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <div
      id={title === "Pipeline Board" ? "pipeline" : title === "Content Calendar" ? "calendar" : undefined}
      className="surface rounded-xl px-4 py-5 text-center"
    >
      <p className="font-[family-name:var(--font-display)] text-lg text-[#0a0a0a]">
        {title}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[#52525b]">
        {description}
      </p>
    </div>
  );
}

function MemoryNode({
  label,
  sub,
  active,
}: {
  label: string;
  sub: string;
  active?: boolean;
}) {
  return (
    <div
      className={`w-full max-w-xs rounded-lg border px-4 py-3 text-center ${
        active
          ? "border-violet-300 bg-violet-50"
          : "border-[#d4d4cc] bg-white"
      }`}
    >
      <p className="text-sm font-medium text-[#0a0a0a]">{label}</p>
      <p className="text-xs text-[#52525b]">{sub}</p>
    </div>
  );
}

function FlowArrow({ short }: { short?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center ${short ? "py-1" : "py-3"}`}
      aria-hidden
    >
      <div className={`w-px bg-[#d4d4cc] ${short ? "h-4" : "h-8"}`} />
      <div className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-[#a1a1aa]" />
    </div>
  );
}

function Tag({ label, small }: { label: string; small?: boolean }) {
  return (
    <span
      className={`rounded-full bg-[#ecece7] font-medium text-[#3f3f46] ${
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      {label}
    </span>
  );
}
