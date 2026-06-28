"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

function getConvexUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  return url || undefined;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = getConvexUrl();

  const client = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!convexUrl || !client) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-[#0a0a0a]">
          Convex not configured
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#52525b]">
          Set{" "}
          <code className="rounded bg-[#ecece7] px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_CONVEX_URL
          </code>{" "}
          in Vercel → Project Settings → Environment Variables, then redeploy.
          Example:{" "}
          <code className="rounded bg-[#ecece7] px-1.5 py-0.5 text-xs">
            https://your-deployment.convex.cloud
          </code>
        </p>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
