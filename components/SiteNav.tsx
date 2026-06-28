import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { ClientSwitcher } from "./ClientSwitcher";

export function SiteNav({
  showNewRun,
  showClientSwitcher,
  activeSiteId,
  runId,
}: {
  showNewRun?: boolean;
  showClientSwitcher?: boolean;
  activeSiteId?: Id<"sites"> | null;
  runId?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#d4d4cc] bg-[#f4f4f0]/95 backdrop-blur-md">
      <div className="app-shell flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[#0a0a0a]">
            Launchpad
          </span>
          <span className="hidden text-sm text-[#52525b] sm:inline">
            GTM from one URL
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href="/how-it-works"
            className="hidden rounded-md px-3 py-1.5 text-[#52525b] hover:bg-[#ecece7] hover:text-[#0a0a0a] sm:inline"
          >
            How it works
          </Link>
          {showNewRun && runId && (
            <>
              <Link
                href={`/run/${runId}`}
                className="hidden rounded-md px-3 py-1.5 text-[#52525b] hover:bg-[#ecece7] hover:text-[#0a0a0a] sm:inline"
              >
                Dashboard
              </Link>
              <Link
                href={`/run/${runId}/pipeline`}
                className="hidden rounded-md px-3 py-1.5 text-[#52525b] hover:bg-[#ecece7] hover:text-[#0a0a0a] sm:inline"
              >
                Pipeline
              </Link>
            </>
          )}
          {showNewRun ? (
            <Link
              href="/"
              className="rounded-md border border-[#d4d4cc] bg-white px-3 py-1.5 font-medium text-[#0a0a0a] hover:bg-[#ecece7]"
            >
              New run
            </Link>
          ) : (
            <span className="hidden text-[#52525b] sm:inline">
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
