import type { Doc } from "@/convex/_generated/dataModel";
import type { BoardLead } from "@/lib/pipeline-board";

export type AttributeSource = "persona" | "lead" | "matched";

export type IdealCustomerAttribute = {
  label: string;
  value: string;
  source: AttributeSource;
};

export type IdealCustomerSignal = {
  headline: string;
  detail: string;
};

export type IdealCustomerProfile = {
  personaId: string;
  personaName: string;
  headline: string;
  attributes: IdealCustomerAttribute[];
  matchedLeads: number;
  exampleCompanies: string[];
  exampleTitles: string[];
  signals: IdealCustomerSignal[];
};

function topValues(values: string[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function formatDealRange(persona: Doc<"personas">): string | null {
  const min = persona.dealSizeMinUsd;
  const max = persona.dealSizeMaxUsd;
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)} ACV`;
  if (min != null) return `${fmt(min)}+ ACV`;
  return `Up to ${fmt(max!)} ACV`;
}

function leadTraits(leads: BoardLead[]): IdealCustomerAttribute[] {
  const traits: IdealCustomerAttribute[] = [];
  let hiring = 0;
  let news = 0;
  let community = 0;
  let scored = 0;
  let intentTotal = 0;

  for (const lead of leads) {
    scored += 1;
    intentTotal += lead.intentScore;
    for (const signal of lead.intentSignals) {
      if (/active opening|open roles|hiring in motion/i.test(signal)) hiring += 1;
      if (/recent news/i.test(signal)) news += 1;
      if (/reddit/i.test(signal)) community += 1;
    }
  }

  if (scored === 0) return traits;

  const avgIntent = Math.round(intentTotal / scored);
  traits.push({
    label: "Observed intent",
    value: `Avg score ${avgIntent} across ${scored} matched account${scored === 1 ? "" : "s"}`,
    source: "matched",
  });

  if (hiring > 0) {
    traits.push({
      label: "Account motion",
      value: `${hiring} match${hiring === 1 ? "" : "es"} show active hiring`,
      source: "lead",
    });
  }
  if (news > 0) {
    traits.push({
      label: "Account motion",
      value: `${news} match${news === 1 ? "" : "es"} have recent company news`,
      source: "lead",
    });
  }
  if (community > 0) {
    traits.push({
      label: "Account motion",
      value: `${community} match${community === 1 ? "" : "es"} discuss the problem publicly`,
      source: "lead",
    });
  }

  return traits;
}

function signalVerb(signal: string): string {
  if (/active opening|open roles|hiring in motion/i.test(signal)) {
    return "who is hiring";
  }
  if (/recent news/i.test(signal)) {
    return "at a company with recent news";
  }
  if (/reddit/i.test(signal)) {
    return "discussing the problem publicly";
  }
  if (/low motion/i.test(signal)) {
    return "with low account motion";
  }
  return "showing buying signals";
}

function parseSignalDetail(lead: BoardLead, signal: string): string {
  const hiringMatch = signal.match(
    /^\[[^\]]+\]\s*(\d+) active opening\(s\) at ([^:]+):\s*(.+)$/,
  );
  if (hiringMatch) {
    const [, count, company, titles] = hiringMatch;
    return `${count} open role${count === "1" ? "" : "s"} at ${company} — ${titles}`;
  }

  const newsMatch = signal.match(/^\[([^\]]+)\] Recent news:\s*(.+)$/);
  if (newsMatch) {
    const [, company, headline] = newsMatch;
    return `${company}: ${headline}`;
  }

  const redditMatch = signal.match(/^\[[^\]]+\] Reddit:\s*(.+)$/);
  if (redditMatch) {
    return redditMatch[1];
  }

  const lowMotionMatch = signal.match(
    /^Low motion for .+ at (.+?) — (.+)$/,
  );
  if (lowMotionMatch) {
    const [, company, reason] = lowMotionMatch;
    return `${company.trim()} — ${reason.trim()}`;
  }

  if (lead.title && lead.company) {
    return `${lead.title} at ${lead.company} — ${signal}`;
  }
  if (lead.company) {
    return `At ${lead.company} — ${signal}`;
  }
  return signal;
}

function buildPersonaSignals(
  personaName: string,
  leads: BoardLead[],
  limit = 6,
): IdealCustomerSignal[] {
  const entries: IdealCustomerSignal[] = [];
  const seen = new Set<string>();
  const sortedLeads = [...leads].sort((a, b) => b.intentScore - a.intentScore);

  for (const lead of sortedLeads) {
    for (const signal of lead.intentSignals) {
      if (signal.startsWith("Deal estimate:")) continue;

      const headline = `${personaName} ${signalVerb(signal)}`;
      const detail = parseSignalDetail(lead, signal);
      const key = `${headline}::${detail}`;
      if (seen.has(key)) continue;
      seen.add(key);

      entries.push({ headline, detail });
      if (entries.length >= limit) return entries;
    }
  }

  return entries;
}

export function buildIdealCustomerProfiles(params: {
  personas: Doc<"personas">[];
  leads: BoardLead[];
}): IdealCustomerProfile[] {
  const { personas, leads } = params;

  return personas.map((persona) => {
    const personaLeads = leads.filter((lead) => lead.personaId === persona._id);
    const attributes: IdealCustomerAttribute[] = [];

    const roles = persona.outboundTargets
      .split(/[,;|/]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (roles.length > 0) {
      attributes.push({
        label: "Target roles",
        value: roles.slice(0, 3).join(" · "),
        source: "persona",
      });
    }

    for (const pain of persona.painPoints.slice(0, 3)) {
      attributes.push({
        label: "Core pain",
        value: pain,
        source: "persona",
      });
    }

    attributes.push({
      label: "Why they buy",
      value: persona.messagingAngle,
      source: "persona",
    });

    attributes.push({
      label: "Message tone",
      value: persona.contentTone,
      source: "persona",
    });

    const dealRange = formatDealRange(persona);
    if (dealRange) {
      attributes.push({
        label: "Expected deal size",
        value: dealRange,
        source: "persona",
      });
    }

    if (persona.pricingModel) {
      attributes.push({
        label: "Pricing model",
        value: persona.pricingModel,
        source: "persona",
      });
    }

    const exampleTitles = topValues(personaLeads.map((l) => l.title));
    for (const title of exampleTitles) {
      attributes.push({
        label: "Matched title",
        value: title,
        source: "lead",
      });
    }

    attributes.push(...leadTraits(personaLeads));

    return {
      personaId: persona._id,
      personaName: persona.name,
      headline: persona.messagingAngle,
      attributes,
      matchedLeads: personaLeads.length,
      exampleCompanies: topValues(personaLeads.map((l) => l.company)),
      exampleTitles,
      signals: buildPersonaSignals(persona.name, personaLeads),
    };
  });
}

export function accountTraitFromSignal(signal: string): string | null {
  if (/active opening|open roles|hiring in motion/i.test(signal)) {
    return "Actively hiring";
  }
  if (/recent news/i.test(signal)) {
    return "Recent momentum";
  }
  if (/reddit/i.test(signal)) {
    return "Public problem discussion";
  }
  return null;
}
