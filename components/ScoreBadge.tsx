import { scoreTier } from "@/lib/monaco-board";

export function ScoreBadge({
  intentScore,
  compact,
}: {
  intentScore: number;
  compact?: boolean;
}) {
  const tier = scoreTier(intentScore);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      } ${
        tier.hot
          ? "border-orange-500/40 bg-orange-500/15 text-orange-200"
          : tier.grade === "B"
            ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
            : "border-white/15 bg-white/5 text-zinc-400"
      }`}
    >
      <span className="font-semibold">{tier.grade}</span>
      {!compact && (
        <>
          <span className="text-white/30">|</span>
          {tier.hot && <span aria-hidden>🔥</span>}
          <span>{tier.label}</span>
        </>
      )}
    </span>
  );
}
