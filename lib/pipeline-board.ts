import {
  defaultPipelineStage,
  type PipelineStage,
} from "./pipeline";
import {
  computeDealValue,
  defaultPersonaEconomics,
  personaEconomicsFromPersona,
} from "@/lib/deal-value";

export const PIPELINE_COLUMNS = [
  {
    id: "discovery",
    label: "Discovery",
    hint: "Account found — not contacted yet",
    stages: ["inbound", "new", "prospecting"] as PipelineStage[],
  },
  {
    id: "nurture",
    label: "Nurture",
    hint: "Outreach sent — warming the account",
    stages: ["nurture"] as PipelineStage[],
  },
  {
    id: "proposal",
    label: "Proposal",
    hint: "Discovery meeting done — in deal conversation",
    stages: ["opportunity"] as PipelineStage[],
  },
  {
    id: "won",
    label: "Closed Won",
    hint: "Signed customer",
    stages: ["customer"] as PipelineStage[],
  },
] as const;

export type PipelineColumnId = (typeof PIPELINE_COLUMNS)[number]["id"];

export function resolveStage(
  stage: PipelineStage | undefined,
  _intentScore: number,
): PipelineStage {
  return defaultPipelineStage(stage);
}

export function columnForStage(stage: PipelineStage): PipelineColumnId {
  for (const column of PIPELINE_COLUMNS) {
    if (column.stages.includes(stage)) return column.id;
  }
  return "discovery";
}

/** @deprecated Use stored estimatedDealValue from Orange Slice scoring */
export function estimatedDealValueFromScore(intentScore: number): number {
  const econ = defaultPersonaEconomics("default");
  const motion = Math.max(0, Math.min(100, (intentScore - 22) / 0.77));
  return computeDealValue(econ, motion).value;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function defaultStageForColumn(columnId: PipelineColumnId): PipelineStage {
  const column = PIPELINE_COLUMNS.find((c) => c.id === columnId);
  if (!column) return "prospecting";
  return column.stages[column.stages.length - 1] ?? "prospecting";
}

export function columnLabel(columnId: PipelineColumnId): string {
  return PIPELINE_COLUMNS.find((c) => c.id === columnId)?.label ?? columnId;
}

export type ScoreTier = {
  grade: "A" | "B" | "C" | "D";
  label: string;
  hot: boolean;
};

export function scoreTier(intentScore: number): ScoreTier {
  if (intentScore >= 85) return { grade: "A", label: "Burning", hot: true };
  if (intentScore >= 70) return { grade: "A", label: "Hot", hot: true };
  if (intentScore >= 55) return { grade: "B", label: "Warm", hot: false };
  if (intentScore >= 40) return { grade: "C", label: "New", hot: false };
  return { grade: "D", label: "Cold", hot: false };
}

export type BoardLead = {
  id: string;
  personaId: string;
  name: string;
  title: string;
  company: string;
  intentScore: number;
  intentSignals: string[];
  stage: PipelineStage;
  columnId: PipelineColumnId;
  value: number;
  motionScore?: number;
  dealValueExplanation?: string;
  personaDealMin?: number;
  personaDealMax?: number;
  pricingModel?: string;
  personaName?: string;
  email?: string;
  linkedin?: string;
};

export type AccountGroup = {
  company: string;
  maxScore: number;
  totalValue: number;
  contacts: BoardLead[];
  personaNames: string[];
  topContact: BoardLead;
};

export function groupLeadsByAccount(leads: BoardLead[]): AccountGroup[] {
  const byCompany = new Map<string, BoardLead[]>();
  for (const lead of leads) {
    const key = lead.company.trim().toLowerCase();
    const list = byCompany.get(key) ?? [];
    list.push(lead);
    byCompany.set(key, list);
  }

  return Array.from(byCompany.values())
    .map((contacts) => {
      const sorted = [...contacts].sort((a, b) => b.intentScore - a.intentScore);
      const topContact = sorted[0]!;
      const personaNames = [...new Set(contacts.map((c) => c.personaName).filter(Boolean))] as string[];
      return {
        company: topContact.company,
        maxScore: topContact.intentScore,
        totalValue: contacts.reduce((sum, c) => sum + c.value, 0),
        contacts: sorted,
        personaNames,
        topContact,
      };
    })
    .sort((a, b) => b.maxScore - a.maxScore);
}

export function toBoardLead(
  lead: {
    _id: string;
    personaId: string;
    name: string;
    title: string;
    company: string;
    intentScore: number;
    pipelineStage?: PipelineStage;
    intentSignals?: string[];
    motionScore?: number;
    estimatedDealValue?: number;
    dealValueExplanation?: string;
    email?: string;
    linkedin?: string;
  },
  persona?: {
    name?: string;
    dealSizeMinUsd?: number;
    dealSizeMaxUsd?: number;
    pricingModel?: string;
  },
): BoardLead {
  const stage = resolveStage(lead.pipelineStage, lead.intentScore);
  const economics = persona
    ? personaEconomicsFromPersona({
        name: persona.name ?? "",
        dealSizeMinUsd: persona.dealSizeMinUsd,
        dealSizeMaxUsd: persona.dealSizeMaxUsd,
        pricingModel: persona.pricingModel,
      })
    : defaultPersonaEconomics("");

  const motion =
    lead.motionScore ??
    Math.max(0, Math.min(100, (lead.intentScore - 22) / 0.77));

  const value =
    lead.estimatedDealValue ??
    computeDealValue(economics, motion).value;

  const explanation =
    lead.dealValueExplanation ??
    computeDealValue(economics, motion).explanation;

  return {
    id: lead._id,
    personaId: lead.personaId,
    name: lead.name,
    title: lead.title,
    company: lead.company,
    intentScore: lead.intentScore,
    intentSignals: lead.intentSignals ?? [],
    motionScore: lead.motionScore,
    dealValueExplanation: explanation,
    stage,
    columnId: columnForStage(stage),
    value,
    personaDealMin: economics.dealSizeMinUsd,
    personaDealMax: economics.dealSizeMaxUsd,
    pricingModel: economics.pricingModel,
    personaName: persona?.name,
    email: lead.email,
    linkedin: lead.linkedin,
  };
}

export function groupLeadsByColumn(leads: BoardLead[]) {
  return PIPELINE_COLUMNS.map((column) => {
    const items = leads
      .filter((l) => l.columnId === column.id)
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((sum, l) => sum + l.value, 0);
    return { ...column, items, total, count: items.length };
  });
}
