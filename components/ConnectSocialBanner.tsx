"use client";

import Link from "next/link";
import { useSocialConnectionSummary } from "./SocialAccountsPanel";

type ConnectSocialBannerProps = {
  variant?: "light" | "dark";
};

export function ConnectSocialBanner({ variant = "light" }: ConnectSocialBannerProps) {
  const { configured, linkedinConnected, linkedinAccountName } = useSocialConnectionSummary();
  const isDark = variant === "dark";

  if (!configured) {
    return null;
  }

  const shell = linkedinConnected
    ? isDark
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-900"
    : isDark
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : "border-amber-200 bg-amber-50 text-amber-950";

  const muted = isDark ? "text-zinc-400" : "text-[#52525b]";
  const linkClass = isDark
    ? "text-white underline underline-offset-2 hover:text-zinc-200"
    : "text-[#0a0a0a] underline underline-offset-2 hover:text-[#52525b]";

  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${shell}`}>
      <div>
        <p className="text-sm font-medium">
          {linkedinConnected
            ? "LinkedIn connected — ready to publish"
            : "Connect social accounts to publish for real"}
        </p>
        <p className={`mt-0.5 text-xs ${linkedinConnected ? (isDark ? "text-emerald-300/80" : "text-emerald-800") : muted}`}>
          {linkedinConnected
            ? linkedinAccountName
              ? `Publishing as ${linkedinAccountName}. Manage all accounts on the connect page.`
              : "Approve LinkedIn posts to publish live. Manage all accounts on the connect page."
            : "One-time OAuth per platform — then Approve posts from this tab."}
        </p>
      </div>
      <Link href="/connect" className={`shrink-0 text-xs font-medium ${linkClass}`}>
        {linkedinConnected ? "Manage accounts" : "Connect accounts →"}
      </Link>
    </div>
  );
}
