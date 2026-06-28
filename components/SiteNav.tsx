import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { ClientSwitcher } from "./ClientSwitcher";

export function SiteNav({
  showNewRun,
  showClientSwitcher,
  activeSiteId,
  runId,
  landing,
}: {
  showNewRun?: boolean;
  showClientSwitcher?: boolean;
  activeSiteId?: Id<"sites"> | null;
  runId?: string;
  landing?: boolean;
}) {
  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md ${
        landing
          ? "border-[#d4d4cc]/80 bg-[#f4f4f0]/80"
          : "border-[#d4d4cc] bg-[#f4f4f0]/95"
      }`}
    >
      <div className="app-shell flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[#0a0a0a]">
            Autogrow
          </span>
          {!landing && (
            <span className="hidden text-sm text-[#52525b] lg:inline">
              The growth engine that runs itself
            </span>
          )}
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm sm:gap-2">
          <Link
            href="/connect"
            className="hidden rounded-md px-3 py-1.5 text-[#52525b] hover:bg-[#ecece7] hover:text-[#0a0a0a] sm:inline"
          >
            Connect
          </Link>
          <Link
            href="/how-it-works"
            className="hidden rounded-md px-3 py-1.5 text-[#52525b] hover:bg-[#ecece7] hover:text-[#0a0a0a] sm:inline"
          >
            How it works
          </Link>
          {landing ? (
            <Link
              href="/how-it-works"
              className="rounded-md border border-[#d4d4cc] bg-white px-3 py-1.5 font-medium text-[#0a0a0a] hover:bg-[#ecece7] sm:hidden"
            >
              How it works
            </Link>
          ) : null}
          {showNewRun && (
            <Link
              href="/"
              className="rounded-md border border-[#d4d4cc] bg-white px-3 py-1.5 font-medium text-[#0a0a0a] hover:bg-[#ecece7]"
            >
              New run
            </Link>
          )}
          {!showNewRun && !landing && (
            <span className="hidden text-[#52525b] md:inline">
              Personas · Outbound · Inbound
            </span>
          )}
          {(showClientSwitcher || showNewRun || activeSiteId) && (
            <ClientSwitcher activeSiteId={activeSiteId} />
          )}
        </nav>
      </div>
    </header>
  );
}
