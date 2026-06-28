/** Persona-specific deal economics inferred from the seller's site. */

export type PersonaEconomics = {
  dealSizeMinUsd: number;
  dealSizeMaxUsd: number;
  pricingModel: string;
};

export type MotionBreakdown = {
  motionScore: number;
  factors: string[];
};

export function computeMotion(breakdown: {
  jobCount: number;
  newsCount: number;
  hasReddit: boolean;
}): MotionBreakdown {
  const factors: string[] = [];
  let motion = 12;

  if (breakdown.jobCount > 0) {
    motion += Math.min(38, 12 + breakdown.jobCount * 7);
    factors.push(
      `${breakdown.jobCount} open role${breakdown.jobCount === 1 ? "" : "s"} — hiring in motion`,
    );
  }

  if (breakdown.newsCount > 0) {
    motion += Math.min(28, 8 + breakdown.newsCount * 5);
    factors.push(
      `${breakdown.newsCount} recent news hit${breakdown.newsCount === 1 ? "" : "s"} — company in motion`,
    );
  }

  if (breakdown.hasReddit) {
    motion += 14;
    factors.push("Reddit / social mention — market awareness");
  }

  if (factors.length === 0) {
    factors.push("No hiring, news, or social signals — low motion");
  }

  return {
    motionScore: Math.min(100, Math.max(5, motion)),
    factors,
  };
}

export function computeDealValue(
  economics: PersonaEconomics,
  motionScore: number,
): { value: number; explanation: string } {
  const min = economics.dealSizeMinUsd;
  const max = Math.max(min, economics.dealSizeMaxUsd);
  const t = motionScore / 100;
  const value = Math.round(min + (max - min) * t);

  const motionLabel =
    motionScore >= 78
      ? "High motion"
      : motionScore >= 52
        ? "Moderate motion"
        : "Low motion";

  const explanation = `${economics.pricingModel} · $${min.toLocaleString()}–$${max.toLocaleString()} segment · ${motionLabel} (${motionScore}/100)`;

  return { value, explanation };
}

export function defaultPersonaEconomics(personaName: string): PersonaEconomics {
  const lower = personaName.toLowerCase();
  if (
    lower.includes("enterprise") ||
    lower.includes("chain") ||
    lower.includes("franchise")
  ) {
    return {
      dealSizeMinUsd: 12_000,
      dealSizeMaxUsd: 48_000,
      pricingModel: "Annual platform (estimated)",
    };
  }
  if (
    lower.includes("owner") ||
    lower.includes("café") ||
    lower.includes("cafe") ||
    lower.includes("smb") ||
    lower.includes("independent")
  ) {
    return {
      dealSizeMinUsd: 480,
      dealSizeMaxUsd: 3_600,
      pricingModel: "Per-location annual (estimated)",
    };
  }
  return {
    dealSizeMinUsd: 2_400,
    dealSizeMaxUsd: 12_000,
    pricingModel: "Annual contract (estimated)",
  };
}

export function normalizePersonaEconomics(
  raw: Partial<PersonaEconomics> | undefined,
  personaName: string,
): PersonaEconomics {
  const defaults = defaultPersonaEconomics(personaName);
  let min = raw?.dealSizeMinUsd ?? defaults.dealSizeMinUsd;
  let max = raw?.dealSizeMaxUsd ?? defaults.dealSizeMaxUsd;
  if (!Number.isFinite(min) || min < 0) min = defaults.dealSizeMinUsd;
  if (!Number.isFinite(max) || max < min) max = Math.max(min, defaults.dealSizeMaxUsd);
  if (max > 500_000) max = 500_000;
  return {
    dealSizeMinUsd: Math.round(min),
    dealSizeMaxUsd: Math.round(max),
    pricingModel: raw?.pricingModel?.trim() || defaults.pricingModel,
  };
}

export function personaEconomicsFromPersona(persona: {
  name: string;
  dealSizeMinUsd?: number;
  dealSizeMaxUsd?: number;
  pricingModel?: string;
}): PersonaEconomics {
  return normalizePersonaEconomics(
    {
      dealSizeMinUsd: persona.dealSizeMinUsd,
      dealSizeMaxUsd: persona.dealSizeMaxUsd,
      pricingModel: persona.pricingModel,
    },
    persona.name,
  );
}
