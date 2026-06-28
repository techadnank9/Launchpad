"use client";

import Link from "next/link";
import { SiteNav } from "./SiteNav";
import { SocialAccountsPanel } from "./SocialAccountsPanel";

export function SocialAccountsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />
      <main className="app-shell flex-1 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wide text-[#52525b]">
              Settings
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[#0a0a0a]">
              Connect social accounts
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#52525b]">
              Link LinkedIn, X, and Instagram so Autogrow can publish approved posts.
              LinkedIn live publishing is enabled today; other platforms store the connection
              for upcoming support.
            </p>
          </div>

          <SocialAccountsPanel />

          <div className="mt-8 rounded-xl border border-[#d4d4cc] bg-[#fafaf8] px-4 py-4 text-sm text-[#52525b]">
            <p className="font-medium text-[#0a0a0a]">After connecting</p>
            <p className="mt-1">
              Open any run&apos;s Publish tab and approve a LinkedIn post to verify live
              publishing.
            </p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm font-medium text-[#0a0a0a] underline underline-offset-2 hover:text-[#52525b]"
            >
              Start a new run →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
