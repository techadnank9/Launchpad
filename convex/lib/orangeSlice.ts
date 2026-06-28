"use node";

/**
 * Orange Slice intent scoring via the `orangeslice` npm package.
 * Uses PredictLeads (job openings, news) + web search (Reddit mentions).
 * Not MCP — called directly from Convex Node actions.
 */
import { configure, predictLeads, webSearch } from "orangeslice";
import type { LeadResult } from "./fiber";
import type { PersonaResult } from "./openai";
import { getOrangeSliceApiKey, optionalEnv } from "./env";

export type ScoredLead = LeadResult & {
  intentScore: number;
  intentSignals: string[];
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

async function scoreLead(
  lead: LeadResult,
  persona: PersonaResult,
): Promise<ScoredLead> {
  const domain = companyDomain(lead);
  const signals: string[] = [];
  let score = 35;

  try {
    const jobsResult = (await predictLeads.companyJobOpenings({
      company_id_or_domain: domain,
      active_only: true,
      limit: 5,
    })) as PredictLeadsList<PredictLeadsJob>;
    const jobCount = jobsResult.data.length;
    if (jobCount > 0) {
      score += Math.min(25, 10 + jobCount * 5);
      const titles = jobsResult.data
        .slice(0, 2)
        .map((job) => job.attributes.title)
        .join(", ");
      signals.push(`${jobCount} active job opening(s): ${titles}`);
    }
  } catch {
    // Job openings lookup is optional enrichment.
  }

  try {
    const newsResult = (await predictLeads.companyNewsEvents({
      company_id_or_domain: domain,
      limit: 5,
    })) as PredictLeadsList<PredictLeadsNews>;
    const newsItems = newsResult.data;
    if (newsItems.length > 0) {
      score += Math.min(20, 10 + newsItems.length * 3);
      const headline = newsItems[0].attributes.summary.slice(0, 100);
      signals.push(`Recent news: ${headline}`);
    }
  } catch {
    // News lookup is optional enrichment.
  }

  try {
    const topic = persona.outboundTargets.split(",")[0]?.trim() ?? "";
    const redditQuery = `"${lead.company}" site:reddit.com ${topic}`.trim();
    const reddit = await webSearch({ query: redditQuery, page: 1 });
    if (reddit.results.length > 0) {
      score += 15;
      signals.push(
        `Reddit mention: "${reddit.results[0].title.slice(0, 80)}"`,
      );
    }
  } catch {
    // Reddit search is optional enrichment.
  }

  if (signals.length === 0) {
    signals.push(
      `No strong buy signals found for ${persona.name} at ${lead.company}`,
    );
  }

  return {
    ...lead,
    intentScore: Math.min(99, Math.max(10, score)),
    intentSignals: signals,
  };
}

export async function scoreLeads(
  leads: LeadResult[],
  persona: PersonaResult,
): Promise<ScoredLead[]> {
  if (leads.length === 0) {
    throw new Error(`No leads to score for persona "${persona.name}"`);
  }

  initOrangeSlice();

  const scored = await Promise.all(
    leads.map((lead) => scoreLead(lead, persona)),
  );

  return scored.sort((a, b) => b.intentScore - a.intentScore);
}
