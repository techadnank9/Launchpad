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
}: {
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitUrl = useMutation(api.runs.submitUrl);
  const router = useRouter();

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
    <div className="w-full max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-2 sm:flex-row sm:gap-0"
      >
        <div className="surface flex min-w-0 flex-1 items-center overflow-hidden rounded-lg sm:rounded-r-none">
          <span className="hidden shrink-0 border-r border-[#d4d4cc] bg-[#fafaf8] px-3 py-3.5 font-mono text-xs text-[#52525b] sm:block">
            https://
          </span>
          <input
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="thecorgi.cafe"
            autoFocus={autoFocus}
            disabled={loading}
            className="min-w-0 flex-1 bg-white px-4 py-3.5 text-base text-[#0a0a0a] placeholder:text-[#a1a1aa] focus:outline-none disabled:text-[#52525b]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className={`btn-primary shrink-0 rounded-lg px-6 py-3.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-[#737373] ${
            compact ? "" : "sm:rounded-l-none"
          }`}
        >
          {loading ? "Running…" : "Run"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm font-medium text-red-800">{error}</p>
      )}
    </div>
  );
}

const DELIVERABLES = [
  {
    label: "Personas",
    detail: "Who buys, what hurts, how to talk to them",
  },
  {
    label: "Leads",
    detail: "Real contacts, intent-scored, staged in pipeline",
  },
  {
    label: "Outbound",
    detail: "Cold email sequences per segment",
  },
  {
    label: "Inbound",
    detail: "Branded posters + captions on a calendar",
  },
] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteNav showClientSwitcher />

      <main>
        <section className="border-b border-[#d4d4cc] bg-[#f4f4f0]">
          <div className="app-shell py-16 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[1fr_340px] lg:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-[#737373]">
                  Orange Slice hackathon · June 2026
                </p>
                <h1 className="mt-5 max-w-[14ch] font-[family-name:var(--font-display)] text-[2.75rem] leading-[1.05] tracking-tight text-[#0a0a0a] sm:text-6xl">
                  Your site. Every persona. One run.
                </h1>
                <p className="mt-6 max-w-md text-base leading-relaxed text-[#3f3f46] sm:text-lg">
                  Launchpad reads your homepage, splits the market into buyer
                  segments, then runs outbound and inbound for each — leads,
                  emails, posts, meetings — at the same time.
                </p>
                <div className="mt-10">
                  <UrlInputForm autoFocus />
                </div>
                <p className="mt-4 text-xs text-[#737373]">
                  <Link
                    href="/how-it-works"
                    className="text-[#52525b] underline underline-offset-2 hover:text-[#0a0a0a]"
                  >
                    See the flow
                  </Link>
                  <span className="mx-2">·</span>
                  Fiber, Orange Slice, GPT-4o wired in
                </p>
              </div>

              <div className="surface rounded-xl p-5 lg:mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#a1a1aa]">
                  What lands in your dashboard
                </p>
                <ul className="mt-4 space-y-4">
                  {DELIVERABLES.map((item) => (
                    <li key={item.label} className="border-b border-[#ecece7] pb-4 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-[#0a0a0a]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#52525b]">
                        {item.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="app-shell py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[#0a0a0a] sm:text-3xl">
              What happens after you hit Run
            </h2>
            <p className="mt-3 text-[#3f3f46]">
              Four agents per persona. Site analysis runs once, then everything
              fans out in parallel.
            </p>
          </div>

          <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-[#d4d4cc] bg-[#d4d4cc] sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "1",
                title: "Read the site",
                body: "Scrape + GPT-4o. Personas, brand colors, messaging angles. Merges with prior runs on the same domain.",
              },
              {
                n: "2",
                title: "Find buyers",
                body: "Fiber surfaces leads. Orange Slice scores intent. High-fit contacts get meetings on your calendar.",
              },
              {
                n: "3",
                title: "Write outbound",
                body: "Multi-touch email per persona — not one generic blast.",
              },
              {
                n: "4",
                title: "Ship inbound",
                body: "On-brand poster + caption per persona, queued to LinkedIn, X, and Instagram.",
              },
            ].map((item) => (
              <li key={item.n} className="bg-white p-5">
                <span className="font-mono text-xs text-[#a1a1aa]">{item.n}</span>
                <h3 className="mt-2 text-sm font-semibold text-[#0a0a0a]">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#52525b]">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-[#d4d4cc] bg-white">
          <div className="app-shell flex flex-col items-start justify-between gap-8 py-14 sm:flex-row sm:items-center">
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl text-[#0a0a0a] sm:text-2xl">
                Try it on your domain.
              </p>
              <p className="mt-1 text-sm text-[#52525b]">
                Takes about two minutes to see the first personas.
              </p>
            </div>
            <UrlInputForm compact />
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d4d4cc] py-6 text-center text-xs text-[#a1a1aa]">
        Launchpad
      </footer>
    </div>
  );
}
