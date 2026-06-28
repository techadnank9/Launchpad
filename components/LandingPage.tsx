"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SiteNav } from "./SiteNav";

export function UrlInputForm({
  autoFocus,
  compact,
  variant = "default",
}: {
  autoFocus?: boolean;
  compact?: boolean;
  variant?: "default" | "hero" | "dark";
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitUrl = useMutation(api.runs.submitUrl);
  const router = useRouter();

  const isHero = variant === "hero";
  const isDark = variant === "dark";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const runId = await submitUrl({ url: url.trim() });
      router.push(`/run/${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`w-full ${
        isHero ? "mx-auto max-w-2xl" : compact ? "max-w-lg" : "max-w-xl"
      }`}
    >
      {isHero ? (
        <label className="mb-3 block text-center text-sm font-medium text-[#0a0a0a]">
          Your website URL
        </label>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className={`flex w-full flex-col gap-3 ${
          isHero ? "items-center" : compact ? "sm:flex-row sm:items-stretch sm:gap-0" : "sm:flex-row sm:items-stretch sm:gap-0"
        }`}
      >
        <div
          className={`flex min-h-[52px] w-full items-center overflow-hidden border shadow-sm ${
            isDark
              ? "border-white/15 bg-white/10"
              : "border-[#c8c8c0] bg-white"
          } ${isHero ? "rounded-xl" : "min-w-0 flex-1 rounded-lg sm:rounded-r-none"}`}
        >
          {!isHero ? (
            <span
              className={`hidden shrink-0 border-r px-3 font-mono text-xs sm:block ${
                isDark
                  ? "border-white/10 bg-white/5 py-4 text-zinc-300"
                  : "border-[#d4d4cc] bg-[#fafaf8] py-4 text-[#52525b]"
              }`}
            >
              https://
            </span>
          ) : null}
          <input
            type="text"
            inputMode="url"
            name="website-url"
            aria-label="Your website URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={isHero ? "https://yourcompany.com" : "yourcompany.com"}
            autoFocus={autoFocus}
            disabled={loading}
            className={`w-full bg-transparent px-4 text-base focus:outline-none disabled:opacity-60 ${
              isHero ? "py-4 text-center placeholder:text-center" : "min-w-0 flex-1"
            } ${
              isDark
                ? "py-4 text-white placeholder:text-zinc-400"
                : "py-4 text-[#0a0a0a] placeholder:text-[#737373]"
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className={`font-medium transition disabled:cursor-not-allowed ${
            isDark
              ? "min-h-[52px] w-full rounded-xl bg-white px-6 text-sm text-[#0a0a0a] hover:bg-zinc-100 disabled:bg-zinc-600 disabled:text-zinc-300 sm:w-auto"
              : "btn-primary min-h-[52px] disabled:bg-[#737373]"
          } ${
            isHero
              ? "w-full rounded-xl px-7 py-4 text-sm sm:w-auto"
              : `shrink-0 rounded-lg px-6 py-3.5 text-sm ${compact ? "" : "sm:rounded-l-none"}`
          }`}
        >
          {loading ? "Starting…" : "Start growth run"}
        </button>
      </form>
      {error && (
        <p
          className={`mt-3 text-sm font-medium ${isDark ? "text-red-300" : "text-red-800"}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

const METRICS = [
  { value: "1 URL", label: "Kicks off the full motion" },
  { value: "4 agents", label: "Per buyer persona" },
  { value: "~2 min", label: "To your first segments" },
] as const;

const OUTPUTS = [
  {
    title: "Buyer personas",
    detail: "Segments, pain points, and messaging angles pulled from your site.",
    span: "lg:col-span-2",
    tone: "light",
  },
  {
    title: "Scored leads",
    detail: "Contacts with intent signals, staged in pipeline.",
    span: "",
    tone: "dark",
  },
  {
    title: "Outbound sequences",
    detail: "Multi-touch email per segment — not one generic blast.",
    span: "",
    tone: "light",
  },
  {
    title: "Social campaigns",
    detail: "Branded posters, captions, and publish-ready calendar slots.",
    span: "lg:col-span-2",
    tone: "accent",
  },
] as const;

const STEPS = [
  {
    title: "Read the site",
    body: "Brand kit, positioning, and 3–5 buyer personas from a single homepage scrape.",
  },
  {
    title: "Find and score buyers",
    body: "Leads surfaced with intent data. High-fit contacts can land meetings on your calendar.",
  },
  {
    title: "Run outbound + inbound",
    body: "Cold sequences, social posts, and scheduling — all segmented, all parallel.",
  },
] as const;

function ProductPreview() {
  return (
    <div className="landing-preview relative mx-auto w-full max-w-[540px] lg:mx-0 lg:max-w-none">
      <div className="landing-shadow overflow-hidden rounded-2xl border border-[#d4d4cc] bg-[#0a0a0a]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="font-mono text-[10px] text-zinc-500">autogrow.app/run</span>
        </div>

        <div className="grid min-h-[360px] grid-cols-[132px_1fr] sm:min-h-[420px]">
          <aside className="border-r border-white/10 bg-[#111111] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
              Personas
            </p>
            <ul className="mt-3 space-y-1.5">
              {[
                { name: "Enterprise CTO", active: true },
                { name: "Ops Lead", active: false },
                { name: "Founder", active: false },
              ].map((persona) => (
                <li
                  key={persona.name}
                  className={`rounded-md px-2.5 py-2 text-[11px] ${
                    persona.active
                      ? "bg-white text-[#0a0a0a]"
                      : "text-zinc-400"
                  }`}
                >
                  {persona.name}
                </li>
              ))}
            </ul>
          </aside>

          <div className="flex flex-col bg-[#0f0f0f] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-white">Enterprise CTO</p>
                <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
                  Pipeline · Campaigns · Calendar
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] text-emerald-300">
                Live
              </span>
            </div>

            <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_140px]">
              <div className="rounded-lg border border-white/10 bg-[#141414] p-2.5">
                <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                  Pipeline
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Discovery", count: 12 },
                    { label: "Nurture", count: 8 },
                    { label: "Proposal", count: 3 },
                  ].map((col) => (
                    <div
                      key={col.label}
                      className="rounded-md border border-white/5 bg-[#1a1a1a] p-2"
                    >
                      <p className="text-[9px] text-zinc-500">{col.label}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{col.count}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#141414] p-2.5">
                <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                  Next post
                </p>
                <div className="mt-2 overflow-hidden rounded-md border border-white/5">
                  <div className="aspect-[4/5] bg-gradient-to-br from-[#d4cec3] via-[#8fa68e] to-[#2f4a3f]" />
                  <div className="space-y-1 p-2">
                    <p className="line-clamp-2 text-[9px] leading-relaxed text-zinc-400">
                      Cut onboarding time without adding headcount…
                    </p>
                    <p className="font-mono text-[8px] text-zinc-600">LinkedIn · Tue 9:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-[#d4d4cc] bg-white px-4 py-3 shadow-lg sm:block">
        <p className="font-mono text-[9px] uppercase tracking-wider text-[#a1a1aa]">
          Output
        </p>
        <p className="mt-1 text-sm font-semibold text-[#0a0a0a]">23 leads · 3 campaigns</p>
      </div>
    </div>
  );
}

function OutputCard({
  title,
  detail,
  span,
  tone,
}: {
  title: string;
  detail: string;
  span: string;
  tone: "light" | "dark" | "accent";
}) {
  const styles = {
    light: "border-[#d4d4cc] bg-white text-[#0a0a0a]",
    dark: "border-[#0a0a0a] bg-[#0a0a0a] text-white",
    accent: "border-[#2f4a3f] bg-[#eef3f0] text-[#0a0a0a]",
  }[tone];

  const detailColor =
    tone === "dark" ? "text-zinc-400" : tone === "accent" ? "text-[#3f5248]" : "text-[#52525b]";

  return (
    <article
      className={`flex min-h-[180px] flex-col justify-between rounded-2xl border p-6 ${styles} ${span}`}
    >
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">{title}</h3>
        <p className={`mt-3 max-w-sm text-sm leading-relaxed ${detailColor}`}>{detail}</p>
      </div>
      <div
        className={`mt-8 h-px w-12 ${tone === "dark" ? "bg-white/20" : tone === "accent" ? "bg-[#2f4a3f]/30" : "bg-[#d4d4cc]"}`}
      />
    </article>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteNav showClientSwitcher landing />

      <main>
        <section className="landing-grid relative overflow-hidden border-b border-[#d4d4cc]">
          <div className="app-shell relative py-16 sm:py-20 lg:py-24">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#d4d4cc] bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#52525b] backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2f4a3f]" />
                Autogrow
              </p>
              <h1 className="mt-6 max-w-[14ch] font-[family-name:var(--font-display)] text-[2.85rem] leading-[1.02] tracking-[-0.02em] text-[#0a0a0a] sm:text-[3.5rem] lg:text-[4rem]">
                The growth engine that runs itself
              </h1>
              <div className="mt-8 w-full">
                <UrlInputForm autoFocus variant="hero" />
              </div>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#3f3f46] sm:text-[1.05rem]">
                Paste your URL. Autogrow reads the site, splits the market into
                buyer segments, and runs outbound plus inbound for each — in parallel.
              </p>
              <p className="mt-4 text-sm text-[#52525b]">
                No setup. No templates to fill.{" "}
                <Link
                  href="/how-it-works"
                  className="font-medium text-[#0a0a0a] underline underline-offset-4 hover:text-[#52525b]"
                >
                  See how it works
                </Link>
              </p>
            </div>

            <div className="mt-14 flex justify-center lg:mt-16">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="border-b border-[#d4d4cc] bg-white">
          <div className="app-shell grid gap-8 py-10 sm:grid-cols-3 sm:py-12">
            {METRICS.map((metric) => (
              <div key={metric.label} className="border-[#ecece7] sm:border-r sm:last:border-r-0 sm:pr-8 sm:last:pr-0">
                <p className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[#0a0a0a]">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#52525b]">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-shell py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#737373]">
              One run, four motions
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[#0a0a0a] sm:text-4xl">
              Everything a GTM team would ship — generated together
            </h2>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {OUTPUTS.map((item) => (
              <OutputCard key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section className="border-y border-[#d4d4cc] bg-[#fafaf8]">
          <div className="app-shell grid gap-12 py-16 lg:grid-cols-[280px_1fr] lg:py-24">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#737373]">
                The flow
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[#0a0a0a]">
                From homepage to pipeline
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#52525b]">
                Site analysis runs once. Every persona gets its own outbound and
                inbound stack — simultaneously.
              </p>
            </div>

            <ol className="space-y-0">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative border-l border-[#d4d4cc] pb-10 pl-8 last:pb-0"
                >
                  <span className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-[#d4d4cc] bg-white font-mono text-[11px] text-[#52525b]">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-[#0a0a0a]">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#52525b]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#0a0a0a] text-white">
          <div className="app-shell grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-xl">
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
                Put your domain on autopilot
              </h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                Start a growth run and watch personas, leads, emails, and campaigns
                appear in one workspace — ready to review and publish.
              </p>
            </div>
            <UrlInputForm variant="dark" compact />
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d4d4cc] bg-[#f4f4f0]">
        <div className="app-shell flex flex-col gap-2 py-8 text-sm text-[#737373] sm:flex-row sm:items-center sm:justify-between">
          <p className="font-[family-name:var(--font-display)] text-base text-[#0a0a0a]">
            Autogrow
          </p>
          <p>The growth engine that runs itself</p>
        </div>
      </footer>
    </div>
  );
}
