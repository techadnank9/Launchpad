import { stageFromIntentScore, type PipelineStage } from "./pipeline";

export const MONACO_COLUMNS = [
  {
    id: "discovery",
    label: "Discovery",
    stages: ["inbound", "new", "prospecting"] as PipelineStage[],
  },
  {
    id: "nurture",
    label: "Nurture",
    stages: ["nurture"] as PipelineStage[],
  },
  {
    id: "proposal",
    label: "Proposal",
    stages: ["opportunity"] as PipelineStage[],
  },
  {
    id: "won",
    label: "Closed Won",
    stages: ["customer"] as PipelineStage[],
  },
] as const;

export type MonacoColumnId = (typeof MONACO_COLUMNS)[number]["id"];

export function resolveStage(
  stage: PipelineStage | undefined,
  intentScore: number,
): PipelineStage {
  return stage ?? stageFromIntentScore(intentScore);
}

export function columnForStage(stage: PipelineStage): MonacoColumnId {
  for (const column of MONACO_COLUMNS) {
    if (column.stages.includes(stage)) return column.id;
  }
  return "discovery";
}

/** Rough ACV estimate from intent score for board totals */
export function estimatedDealValue(intentScore: number): number {
  return Math.round((intentScore / 100) * 75_000 + 12_500);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function defaultStageForColumn(columnId: MonacoColumnId): PipelineStage {
  const column = MONACO_COLUMNS.find((c) => c.id === columnId);
  if (!column) return "prospecting";
  return column.stages[column.stages.length - 1] ?? "prospecting";
}

export function columnLabel(columnId: MonacoColumnId): string {
  return MONACO_COLUMNS.find((c) => c.id === columnId)?.label ?? columnId;
}

export type BoardLead = {
  id: string;
  name: string;
  title: string;
  company: string;
  intentScore: number;
  intentSignals: string[];
  stage: PipelineStage;
  columnId: MonacoColumnId;
  value: number;
  personaName?: string;
  email?: string;
  linkedin?: string;
};

export function toBoardLead(
  lead: {
    _id: string;
    name: string;
    title: string;
    company: string;
    intentScore: number;
    pipelineStage?: PipelineStage;
    intentSignals?: string[];
    email?: string;
    linkedin?: string;
  },
  personaName?: string,
): BoardLead {
  const stage = resolveStage(lead.pipelineStage, lead.intentScore);
  return {
    id: lead._id,
    name: lead.name,
    title: lead.title,
    company: lead.company,
    intentScore: lead.intentScore,
    intentSignals: lead.intentSignals ?? [],
    stage,
    columnId: columnForStage(stage),
    value: estimatedDealValue(lead.intentScore),
    personaName,
    email: lead.email,
    linkedin: lead.linkedin,
  };
}

export function groupLeadsByColumn(leads: BoardLead[]) {
  return MONACO_COLUMNS.map((column) => {
    const items = leads
      .filter((l) => l.columnId === column.id)
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((sum, l) => sum + l.value, 0);
    return { ...column, items, total, count: items.length };
  });
}
