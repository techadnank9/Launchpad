"use node";

/**
 * Orange Slice intent scoring via the `orangeslice` npm package.
 * Uses PredictLeads (job openings, news) + web search (Reddit mentions).
 * Personalized per persona economics and product context from site analysis.
 */
import { configure, predictLeads, webSearch } from "orangeslice";
import type { LeadResult } from "./fiber";
import type { PersonaResult } from "./openai";
import { getOrangeSliceApiKey, optionalEnv } from "./env";
import {
  computeDealValue,
  computeMotion,
  personaEconomicsFromPersona,
} from "./dealValue";

export type ScoredLead = LeadResult & {
  intentScore: number;
  intentSignals: string[];
  motionScore: number;
  estimatedDealValue: number;
  dealValueExplanation: string;
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
]);

type PredictLeadsJob = {
  attributes: { title: string };
};

type PredictLeadsNews = {
  attributes: { summary: string };
};

type PredictLeadsList<T> = {
  data: T[];
};

export type ScoreLeadsContext = {
  productSummary?: string;
  sellerBrandName?: string;
};

function companyDomain(lead: LeadResult): string {
  const emailDomain = lead.email?.split("@")[1]?.toLowerCase();
  if (emailDomain && !FREE_EMAIL_DOMAINS.has(emailDomain)) {
    return emailDomain;
  }

  const slug = lead.company
    .trim()
    .toLowerCase()
    .replace(/\s+(inc|llc|ltd|co|corp|corporation|company)\.?$/i, "")
    .replace(/[^a-z0-9]/g, "");

  return slug ? `${slug}.com` : lead.company.toLowerCase();
}

function initOrangeSlice() {
  const baseUrl = optionalEnv("ORANGESLICE_BASE_URL");
  configure({
    apiKey: getOrangeSliceApiKey(),
    ...(baseUrl ? { baseUrl } : {}),
  });
}

function redditSearchQuery(
  lead: LeadResult,
  persona: PersonaResult,
  ctx: ScoreLeadsContext,
): string {
  const pain = persona.painPoints[0]?.slice(0, 60) ?? "";
  const topic = persona.outboundTargets.split(",")[0]?.trim() ?? persona.name;
  const brand = ctx.sellerBrandName?.trim();
  const product = ctx.productSummary?.slice(0, 80) ?? "";

  const parts = [`"${lead.company}"`, "site:reddit.com", topic];
  if (pain) parts.push(pain);
  if (brand) parts.push(brand);
  else if (product) parts.push(product.split(" ")[0] ?? "");

  return parts.filter(Boolean).join(" ").slice(0, 200);
}

function intentFromMotion(motionScore: number): number {
  return Math.min(99, Math.max(10, Math.round(22 + motionScore * 0.77)));
}

async function scoreLead(
  lead: LeadResult,
  persona: PersonaResult,
  ctx: ScoreLeadsContext,
): Promise<ScoredLead> {
  const domain = companyDomain(lead);
  const economics = personaEconomicsFromPersona(persona);
  const signals: string[] = [];

  let jobCount = 0;
  let newsCount = 0;
  let hasReddit = false;

  try {
    const jobsResult = (await predictLeads.companyJobOpenings({
      company_id_or_domain: domain,
      active_only: true,
      limit: 5,
    })) as PredictLeadsList<PredictLeadsJob>;
    jobCount = jobsResult.data.length;
    if (jobCount > 0) {
      const titles = jobsResult.data
        .slice(0, 2)
        .map((job) => job.attributes.title)
        .join(", ");
      signals.push(
        `[${persona.name}] ${jobCount} active opening(s) at ${lead.company}: ${titles}`,
      );
    }
  } catch {
    // Optional enrichment.
  }

  try {
    const newsResult = (await predictLeads.companyNewsEvents({
      company_id_or_domain: domain,
      limit: 5,
    })) as PredictLeadsList<PredictLeadsNews>;
    newsCount = newsResult.data.length;
    if (newsCount > 0) {
      const headline = newsResult.data[0].attributes.summary.slice(0, 100);
      signals.push(`[${lead.company}] Recent news: ${headline}`);
    }
  } catch {
    // Optional enrichment.
  }

  try {
    const redditQuery = redditSearchQuery(lead, persona, ctx);
    const reddit = await webSearch({ query: redditQuery, page: 1 });
    if (reddit.results.length > 0) {
      hasReddit = true;
      signals.push(
        `[${persona.name}] Reddit: "${reddit.results[0].title.slice(0, 80)}"`,
      );
    }
  } catch {
    // Optional enrichment.
  }

  const motion = computeMotion({ jobCount, newsCount, hasReddit });
  const { value, explanation } = computeDealValue(economics, motion.motionScore);

  for (const factor of motion.factors) {
    if (!signals.some((s) => s.includes(factor.slice(0, 20)))) {
      signals.push(factor);
    }
  }

  if (signals.length === 0) {
    signals.push(
      `Low motion for ${persona.name} at ${lead.company} — no hiring, news, or social hits`,
    );
  }

  signals.push(
    `Deal estimate: ${explanation}`,
  );

  return {
    ...lead,
    motionScore: motion.motionScore,
    estimatedDealValue: value,
    dealValueExplanation: explanation,
    intentScore: intentFromMotion(motion.motionScore),
    intentSignals: signals,
  };
}

export async function scoreLeads(
  leads: LeadResult[],
  persona: PersonaResult,
  ctx: ScoreLeadsContext = {},
): Promise<ScoredLead[]> {
  if (leads.length === 0) {
    throw new Error(`No leads to score for persona "${persona.name}"`);
  }

  initOrangeSlice();

  const scored = await Promise.all(
    leads.map((lead) => scoreLead(lead, persona, ctx)),
  );

  return scored.sort((a, b) => b.intentScore - a.intentScore);
}
