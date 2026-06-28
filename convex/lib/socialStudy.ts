"use node";

/**
 * Study a brand's existing social posts before generating posters/captions.
 * 1. Extract social profile links from the website HTML
 * 2. Search Orange Slice for recent public post snippets
 * 3. GPT synthesizes voice + visual patterns
 */
import { configure, webSearch } from "orangeslice";
import OpenAI from "openai";
import { getOrangeSliceApiKey, optionalEnv, requireEnv } from "./env";
import {
  extractSocialLinks,
  type BrandSocialStudy,
  type SocialProfileLink,
} from "./socialStudyTypes";

function initOrangeSlice() {
  const baseUrl = optionalEnv("ORANGESLICE_BASE_URL");
  configure({
    apiKey: getOrangeSliceApiKey(),
    ...(baseUrl ? { baseUrl } : {}),
  });
}

async function searchPlatformPosts(
  brandName: string,
  platform: "instagram" | "x" | "linkedin",
): Promise<Array<{ platform: string; text: string; source?: string }>> {
  const site =
    platform === "x"
      ? "site:twitter.com OR site:x.com"
      : platform === "instagram"
        ? "site:instagram.com"
        : "site:linkedin.com";

  const query = `"${brandName}" ${site}`.slice(0, 180);

  try {
    const result = await webSearch({ query, page: 1 });
    return result.results.slice(0, 4).map((r) => ({
      platform,
      text: `${r.title}${r.snippet ? ` — ${r.snippet}` : ""}`.slice(
        0,
        280,
      ),
      source: r.link,
    }));
  } catch {
    return [];
  }
}

async function synthesizeStudy(input: {
  brandName: string;
  siteUrl: string;
  tagline: string;
  visualStyle: string;
  profiles: SocialProfileLink[];
  snippets: Array<{ platform: string; text: string; source?: string }>;
  siteTextSample: string;
}): Promise<BrandSocialStudy> {
  const client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });

  const snippetBlock =
    input.snippets.length > 0
      ? input.snippets
          .map(
            (s, i) =>
              `${i + 1}. [${s.platform}] ${s.text}${s.source ? `\n   source: ${s.source}` : ""}`,
          )
          .join("\n")
      : "(No public post snippets found — infer cautiously from website copy.)";

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You analyze a brand's EXISTING social media presence before new content is created.
Return JSON:
{
  "captionVoice": "2-3 sentences: tone, sentence length, emoji use, CTA style — based on their real posts",
  "visualPatterns": "2-3 sentences: photography style, colors, subjects, layout patterns seen in their social content",
  "contentThemes": ["theme1", "theme2", "theme3"],
  "hashtags": ["#tag1", "#tag2"],
  "samplePosts": [{"platform": "instagram", "text": "representative caption or post summary"}]
}
Mirror what they actually do — do not invent a generic brand voice.`,
      },
      {
        role: "user",
        content: `Brand: ${input.brandName}
Website: ${input.siteUrl}
Tagline: ${input.tagline}
Site visual style notes: ${input.visualStyle}

Social profiles found on site:
${input.profiles.map((p) => `- ${p.platform}: ${p.url}`).join("\n") || "(none)"}

Public post snippets from search:
${snippetBlock}

Website copy sample:
${input.siteTextSample.slice(0, 2000)}`,
      },
    ],
    temperature: 0.4,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no social study");
  }

  const parsed = JSON.parse(content) as {
    captionVoice?: string;
    visualPatterns?: string;
    contentThemes?: string[];
    hashtags?: string[];
    samplePosts?: Array<{ platform: string; text: string }>;
  };

  const mergedSamples = [
    ...input.snippets.slice(0, 4),
    ...(parsed.samplePosts ?? []).slice(0, 2),
  ];

  return {
    profiles: input.profiles,
    samplePosts: mergedSamples.length
      ? mergedSamples
      : [{ platform: "website", text: input.tagline || input.brandName }],
    captionVoice:
      parsed.captionVoice?.trim() ||
      "Friendly, conversational, short sentences — inferred from website.",
    visualPatterns:
      parsed.visualPatterns?.trim() ||
      input.visualStyle ||
      "Clean, on-brand photography matching website aesthetic.",
    contentThemes: parsed.contentThemes?.slice(0, 5) ?? [],
    hashtags: parsed.hashtags?.slice(0, 8) ?? [],
  };
}

export async function studyBrandSocialPosts(args: {
  html: string;
  siteUrl: string;
  brandName: string;
  tagline: string;
  visualStyle: string;
  siteTextSample: string;
}): Promise<BrandSocialStudy> {
  const profiles = extractSocialLinks(args.html, args.siteUrl);
  initOrangeSlice();

  const domain = (() => {
    try {
      return new URL(args.siteUrl).hostname.replace(/^www\./, "");
    } catch {
      return args.brandName;
    }
  })();

  const searchBrand = args.brandName || domain;

  const [instagram, xPosts, linkedin] = await Promise.all([
    searchPlatformPosts(searchBrand, "instagram"),
    searchPlatformPosts(searchBrand, "x"),
    searchPlatformPosts(searchBrand, "linkedin"),
  ]);

  const snippets = [...instagram, ...xPosts, ...linkedin];

  if (snippets.length === 0 && profiles.length > 0) {
    for (const profile of profiles.slice(0, 2)) {
      try {
        const result = await webSearch({
          query: `site:${new URL(profile.url).hostname} ${searchBrand}`.slice(
            0,
            160,
          ),
          page: 1,
        });
        for (const r of result.results.slice(0, 2)) {
          snippets.push({
            platform: profile.platform,
            text: `${r.title} — ${r.snippet ?? ""}`.slice(0, 280),
            source: r.link,
          });
        }
      } catch {
        // optional
      }
    }
  }

  return synthesizeStudy({
    brandName: searchBrand,
    siteUrl: args.siteUrl,
    tagline: args.tagline,
    visualStyle: args.visualStyle,
    profiles,
    snippets,
    siteTextSample: args.siteTextSample,
  });
}
