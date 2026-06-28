"use client";

import { Doc } from "@/convex/_generated/dataModel";
import Image from "next/image";

type PosterPreviewProps = {
  persona: Doc<"personas">;
  run: Doc<"runs"> | null;
};

function ColorSwatch({ color }: { color: string }) {
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim());
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4d4cc] bg-white px-2 py-0.5 text-xs text-[#3f3f46]">
      {isHex && (
        <span
          className="inline-block h-3 w-3 rounded-full border border-black/10"
          style={{ backgroundColor: color }}
        />
      )}
      {color}
    </span>
  );
}

export function PosterPreview({ persona, run }: PosterPreviewProps) {
  const brandName = run?.brandCompanyName;

  if (!persona.posterUrl) {
    return (
      <div className="space-y-4">
        {brandName && (
          <BrandStrip run={run} personaName={persona.name} />
        )}
        <div className="flex aspect-square max-w-sm items-center justify-center rounded-lg border border-dashed border-[#d4d4cc] bg-[#fafaf8] p-6 text-center">
          <p className="text-sm text-[#52525b]">
            {persona.status === "failed"
              ? "Poster generation failed on this run. Start a new URL to retry."
              : `Generating on-brand poster for ${brandName ?? "your brand"}…`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <BrandStrip run={run} personaName={persona.name} />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="overflow-hidden rounded-lg border border-[#d4d4cc]">
          <Image
            src={persona.posterUrl}
            alt={`${brandName ?? persona.name} poster`}
            width={480}
            height={480}
            className="w-full object-cover"
            unoptimized
          />
        </div>
        {persona.caption && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#52525b]">
              Caption
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#18181b]">
              {persona.caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandStrip({
  run,
  personaName,
}: {
  run: Doc<"runs"> | null;
  personaName: string;
}) {
  if (!run?.brandCompanyName) return null;

  return (
    <div className="rounded-lg border border-[#d4d4cc] bg-[#fafaf8] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#52525b]">
        Brand customization
      </p>
      <p className="mt-1 text-sm font-medium text-[#0a0a0a]">
        {run.brandCompanyName}
        <span className="font-normal text-[#52525b]">
          {" "}
          · tailored for {personaName}
        </span>
      </p>
      {run.brandTagline && (
        <p className="mt-1 text-sm text-[#3f3f46]">{run.brandTagline}</p>
      )}
      {run.brandColors && run.brandColors.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {run.brandColors.map((color) => (
            <ColorSwatch key={color} color={color} />
          ))}
        </div>
      )}
      {run.brandVisualStyle && (
        <p className="mt-2 text-xs leading-relaxed text-[#52525b]">
          {run.brandVisualStyle}
        </p>
      )}
    </div>
  );
}
