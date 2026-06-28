import {
  INITIAL_DISCOVERY_STAGE,
  advancePipelineStage,
  defaultPipelineStage,
  type PipelineStage,
} from "./pipeline";

export type PersonaMemory = {
  name: string;
  painPoints: string[];
  messagingAngle: string;
  contentTone: string;
  outboundTargets: string;
  posterStyle: string;
  dealSizeMinUsd?: number;
  dealSizeMaxUsd?: number;
  pricingModel?: string;
};

export type LeadMemory = {
  name: string;
  title: string;
  company: string;
  email?: string;
  linkedin?: string;
  intentScore: number;
  intentSignals: string[];
  motionScore?: number;
  estimatedDealValue?: number;
  dealValueExplanation?: string;
  pipelineStage: PipelineStage;
};

export function personaSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function personasMatch(a: string, b: string): boolean {
  const slugA = personaSlug(a);
  const slugB = personaSlug(b);
  if (slugA === slugB) return true;
  return slugA.includes(slugB) || slugB.includes(slugA);
}

function pickRicherText(current: string, incoming: string): string {
  return incoming.length >= current.length ? incoming : current;
}

export function mergePersonas(
  cached: PersonaMemory[],
  fresh: PersonaMemory[],
): PersonaMemory[] {
  const merged = [...cached];

  for (const incoming of fresh) {
    const index = merged.findIndex((existing) =>
      personasMatch(existing.name, incoming.name),
    );

    if (index === -1) {
      merged.push(incoming);
      continue;
    }

    const existing = merged[index];
    merged[index] = {
      name: pickRicherText(existing.name, incoming.name),
      painPoints: [
        ...new Set([...existing.painPoints, ...incoming.painPoints]),
      ].slice(0, 5),
      messagingAngle: pickRicherText(
        existing.messagingAngle,
        incoming.messagingAngle,
      ),
      contentTone: pickRicherText(existing.contentTone, incoming.contentTone),
      outboundTargets: pickRicherText(
        existing.outboundTargets,
        incoming.outboundTargets,
      ),
      posterStyle: pickRicherText(existing.posterStyle, incoming.posterStyle),
      dealSizeMinUsd: incoming.dealSizeMinUsd ?? existing.dealSizeMinUsd,
      dealSizeMaxUsd: incoming.dealSizeMaxUsd ?? existing.dealSizeMaxUsd,
      pricingModel:
        pickRicherText(
          existing.pricingModel ?? "",
          incoming.pricingModel ?? "",
        ) || undefined,
    };
  }

  return merged.slice(0, 5);
}

export function leadKey(lead: {
  name: string;
  company: string;
  linkedin?: string;
}): string {
  if (lead.linkedin?.trim()) {
    return lead.linkedin.trim().toLowerCase();
  }
  return `${lead.name.trim().toLowerCase()}|${lead.company.trim().toLowerCase()}`;
}

export function mergeLeads(
  cached: LeadMemory[],
  fresh: LeadMemory[],
): LeadMemory[] {
  const byKey = new Map(cached.map((lead) => [leadKey(lead), lead]));

  for (const incoming of fresh) {
    const key = leadKey(incoming);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, incoming);
      continue;
    }

    const intentScore = Math.max(existing.intentScore, incoming.intentScore);
    byKey.set(key, {
      name: incoming.name || existing.name,
      title: pickRicherText(existing.title, incoming.title),
      company: incoming.company || existing.company,
      email: incoming.email ?? existing.email,
      linkedin: incoming.linkedin ?? existing.linkedin,
      intentScore,
      intentSignals: [
        ...new Set([...existing.intentSignals, ...incoming.intentSignals]),
      ].slice(0, 8),
      motionScore: Math.max(
        existing.motionScore ?? 0,
        incoming.motionScore ?? 0,
      ),
      estimatedDealValue: Math.max(
        existing.estimatedDealValue ?? 0,
        incoming.estimatedDealValue ?? 0,
      ),
      dealValueExplanation:
        (incoming.estimatedDealValue ?? 0) >= (existing.estimatedDealValue ?? 0)
          ? incoming.dealValueExplanation ?? existing.dealValueExplanation
          : existing.dealValueExplanation ?? incoming.dealValueExplanation,
      pipelineStage: advancePipelineStage(
        existing.pipelineStage,
        incoming.pipelineStage ?? INITIAL_DISCOVERY_STAGE,
      ),
    });
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.intentScore - a.intentScore)
    .slice(0, 8);
}

export function toLeadMemory(
  lead: Omit<LeadMemory, "pipelineStage"> & { pipelineStage?: PipelineStage },
): LeadMemory {
  const intentScore = lead.intentScore;
  return {
    ...lead,
    pipelineStage: defaultPipelineStage(lead.pipelineStage),
  };
}
