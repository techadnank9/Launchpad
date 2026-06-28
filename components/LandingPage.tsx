"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SiteNav } from "./SiteNav";

export function UrlInputForm({ autoFocus }: { autoFocus?: boolean }) {
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
    <div className="w-full max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="surface flex w-full gap-0 overflow-hidden rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yoursite.com"
          autoFocus={autoFocus}
          disabled={loading}
          className="min-w-0 flex-1 bg-white px-5 py-4 text-base text-[#0a0a0a] placeholder:text-[#52525b] focus:outline-none disabled:text-[#52525b]"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="border-l border-[#d4d4cc] btn-primary px-8 py-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:bg-[#737373]"
        >
          {loading ? "Starting…" : "Launch GTM"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm font-medium text-red-800">{error}</p>
      )}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteNav showClientSwitcher />

      <main>
        {/* Hero */}
        <section className="border-b border-[#d4d4cc] bg-white">
          <div className="app-shell py-24 sm:py-32">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-[#52525b]">
              Orange Slice Growth Hackathon
            </p>
            <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[1.06] tracking-tight text-[#0a0a0a] sm:text-6xl lg:text-7xl">
              Paste your URL.
              <br />
              We build your GTM.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#3f3f46]">
              Launchpad detects every buyer persona on your site, then runs
              outbound pipelines and inbound content — in parallel.
            </p>
            <div className="mt-12">
              <UrlInputForm autoFocus />
            </div>
            <p className="mt-4 text-sm text-[#52525b]">
              No onboarding. No ICP forms. Just a URL.{" "}
              <Link
                href="/how-it-works"
                className="font-medium text-[#0a0a0a] underline underline-offset-2 hover:no-underline"
              >
                See how it works →
              </Link>
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="app-shell py-20">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[#0a0a0a]">
            Three engines, one input
          </h2>
          <p className="mt-3 max-w-xl text-[#3f3f46]">
            Every sponsor integration fires simultaneously after you submit a URL.
          </p>

          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Persona detection",
                body: "GPT-4o reads your website and surfaces 3–5 distinct buyer segments with messaging briefs.",
              },
              {
                step: "02",
                title: "Outbound pipeline",
                body: "Fiber AI finds leads. Orange Slice scores intent. GPT-4o writes cold email sequences per persona.",
              },
              {
                step: "03",
                title: "Inbound content",
                body: "DALL-E 3 posters and captions per persona, queued for LinkedIn, X, and Instagram in your content calendar.",
              },
            ].map((item) => (
              <li key={item.step}>
                <p className="font-mono text-xs text-[#52525b]">{item.step}</p>
                <h3 className="mt-2 text-base font-semibold text-[#0a0a0a]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3f3f46]">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA repeat */}
        <section className="border-t border-[#d4d4cc] bg-[#ecece7]/50">
          <div className="app-shell py-16 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[#0a0a0a] sm:text-3xl">
              Ready to go to market?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[#3f3f46]">
              Enter your website URL above or paste it here to start.
            </p>
            <div className="mx-auto mt-8 flex justify-center">
              <UrlInputForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d4d4cc] py-8 text-center text-sm text-[#52525b]">
        Launchpad · AI Growth Hackathon 2026
      </footer>
    </div>
  );
}
