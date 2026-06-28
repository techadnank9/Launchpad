export const PIPELINE_STAGES = [
  { id: "inbound", label: "Inbound", tone: "bg-amber-100 text-amber-950 border-amber-200" },
  { id: "new", label: "New", tone: "bg-zinc-200 text-zinc-800 border-zinc-300" },
  {
    id: "prospecting",
    label: "Prospecting",
    tone: "bg-sky-100 text-sky-950 border-sky-200",
  },
  {
    id: "nurture",
    label: "Nurture",
    tone: "bg-fuchsia-100 text-fuchsia-950 border-fuchsia-200",
  },
  {
    id: "opportunity",
    label: "Opportunity",
    tone: "bg-violet-100 text-violet-950 border-violet-200",
  },
  {
    id: "customer",
    label: "Customer",
    tone: "bg-emerald-100 text-emerald-950 border-emerald-200",
  },
  {
    id: "disqualified",
    label: "Disqualified",
    tone: "bg-red-100 text-red-950 border-red-200",
  },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]["id"];

export function stageFromIntentScore(score: number): PipelineStage {
  if (score >= 85) return "opportunity";
  if (score >= 70) return "prospecting";
  if (score >= 55) return "nurture";
  if (score >= 40) return "new";
  return "inbound";
}

export function stageLabel(stage: PipelineStage): string {
  return PIPELINE_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export function stageTone(stage: PipelineStage): string {
  return (
    PIPELINE_STAGES.find((s) => s.id === stage)?.tone ??
    "bg-zinc-100 text-zinc-800 border-zinc-200"
  );
}
