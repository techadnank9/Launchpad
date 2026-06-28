"use node";

import type { PersonaResult } from "./openai";
import { assertOk, requireEnv } from "./env";

export type LeadResult = {
  name: string;
  title: string;
  company: string;
  email?: string;
  linkedin?: string;
};

type FiberProfile = {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  headline?: string | null;
  url?: string | null;
  current_job?: {
    title?: string | null;
    company_name?: string | null;
  } | null;
  experiences?: Array<{
    is_current?: boolean | null;
    title?: string | null;
    company_name?: string | null;
  }> | null;
};

type FiberPeopleSearchResponse = {
  output?: {
    data?: FiberProfile[];
  };
};

type FiberNlpSearchResponse = {
  output?: {
    results?: {
      resultType?: string;
      people?: FiberProfile[];
    };
  };
};

function mapProfile(profile: FiberProfile): LeadResult {
  const currentExp = profile.experiences?.find((e) => e.is_current);
  const job = profile.current_job ?? currentExp;

  const name =
    profile.name?.trim() ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    "Unknown";

  return {
    name,
    title: job?.title ?? profile.headline ?? "Decision Maker",
    company: job?.company_name ?? "Company",
    linkedin: profile.url ?? undefined,
  };
}

async function fiberPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = requireEnv("FIBER_API_KEY");

  const response = await fetch(`https://api.fiber.ai${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, ...body }),
    signal: AbortSignal.timeout(60000),
  });

  await assertOk(response, "Fiber AI");
  return (await response.json()) as T;
}

function searchTermsFromPersona(persona: PersonaResult): string[] {
  const raw = persona.outboundTargets
    .split(/[,;]|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return raw.length > 0 ? raw.slice(0, 3) : [persona.name];
}

async function peopleSearchByTerms(terms: string[]): Promise<FiberProfile[]> {
  const profiles: FiberProfile[] = [];

  for (const term of terms) {
    const data = await fiberPost<FiberPeopleSearchResponse>("/v1/people-search", {
      pageSize: 4,
      searchParams: {
        country3LetterCode: { anyOf: ["USA"] },
        jobTitleV2: {
          anyOf: [{ type: "term", term: term.slice(0, 80) }],
        },
      },
    });

    profiles.push(...(data.output?.data ?? []));
    if (profiles.length >= 8) break;
  }

  return profiles;
}

async function peopleSearchByNlp(query: string): Promise<FiberProfile[]> {
  const data = await fiberPost<FiberNlpSearchResponse>("/v1/nlp-search/run", {
    query: query.slice(0, 500),
    pageSize: 8,
  });

  return data.output?.results?.people ?? [];
}

export async function findLeads(persona: PersonaResult): Promise<LeadResult[]> {
  let profiles: FiberProfile[] = [];

  try {
    profiles = await peopleSearchByNlp(persona.outboundTargets);
  } catch {
    // Fall back to structured search if NLP search fails.
  }

  if (profiles.length === 0) {
    profiles = await peopleSearchByTerms(searchTermsFromPersona(persona));
  }

  const seen = new Set<string>();
  const leads: LeadResult[] = [];

  for (const profile of profiles) {
    const lead = mapProfile(profile);
    const key = lead.linkedin ?? `${lead.name}:${lead.company}`;
    if (seen.has(key)) continue;
    seen.add(key);
    leads.push(lead);
    if (leads.length >= 8) break;
  }

  if (leads.length === 0) {
    throw new Error(
      `Fiber AI returned no leads for persona "${persona.name}"`,
    );
  }

  return leads;
}
