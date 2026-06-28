"use node";

import OpenAI, { toFile } from "openai";
import { optionalEnv, requireEnv } from "./env";

export type BrandKit = {
  companyName: string;
  tagline: string;
  primaryColors: string[];
  visualStyle: string;
  imageryNotes: string;
};

export type PersonaResult = {
  name: string;
  painPoints: string[];
  messagingAngle: string;
  contentTone: string;
  outboundTargets: string;
  posterStyle: string;
  /** Realistic annual deal size USD when selling THIS product to THIS persona */
  dealSizeMinUsd?: number;
  dealSizeMaxUsd?: number;
  pricingModel?: string;
};

export type SiteAnalysisResult = {
  productSummary: string;
  valueProp: string;
  brand: BrandKit;
  personas: PersonaResult[];
};

export type BrandContext = BrandKit & {
  siteUrl: string;
  productSummary: string;
  valueProp: string;
  socialStudy?: BrandSocialStudy;
};

function getClient(): OpenAI {
  return new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
}

import type { SiteMeta } from "./scraper";
import { normalizePersonaEconomics } from "./dealValue";
import type { BrandSocialStudy } from "./socialStudyTypes";
import { formatSocialStudyForPrompt } from "./socialStudyTypes";

export async function analyzeSiteWithGPT(
  url: string,
  siteContent: string,
  meta: SiteMeta,
): Promise<SiteAnalysisResult> {
  const client = getClient();

  const metaBlock = [
    meta.title && `Page title: ${meta.title}`,
    meta.description && `Meta description: ${meta.description}`,
    meta.themeColor && `Theme color: ${meta.themeColor}`,
    meta.ogImage && `OG image URL: ${meta.ogImage}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a GTM strategist and brand analyst. Analyze the website and return JSON with:
{
  "productSummary": "2-3 sentence product summary",
  "valueProp": "core value proposition",
  "brand": {
    "companyName": "official brand/company name from the site",
    "tagline": "brand tagline or positioning line",
    "primaryColors": ["#hex or color name", "..."],
    "visualStyle": "typography, mood, photography style, layout feel",
    "imageryNotes": "logo/mascot motifs, recurring visual elements, iconography"
  },
  "personas": [
    {
      "name": "Persona name",
      "painPoints": ["pain 1", "pain 2"],
      "messagingAngle": "how to pitch to this persona",
      "contentTone": "tone for content",
      "outboundTargets": "who to target for outbound",
      "posterStyle": "persona-specific poster art direction that USES the brand colors and visual identity",
      "dealSizeMinUsd": 480,
      "dealSizeMaxUsd": 3600,
      "pricingModel": "e.g. Per-location annual subscription — realistic for THIS product sold to THIS buyer"
    }
  ]
}
For each persona, set dealSizeMinUsd and dealSizeMaxUsd to a REALISTIC annual contract range if this company sold to that buyer (not generic $65k — indie café owner might be $500–$4k/yr, enterprise chain $25k–$120k/yr). Base ranges on what the website actually sells and who would buy it.
Extract real brand colors and visual identity from the site content and meta tags — not generic defaults.
Each persona posterStyle must reference the brand's colors and imagery while tailoring mood to that persona.
Return 3-5 distinct buyer personas.`,
      },
      {
        role: "user",
        content: `Website URL: ${url}\n\nSite meta:\n${metaBlock || "(none)"}\n\nWebsite content:\n${siteContent}`,
      },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no site analysis response");

  const parsed = JSON.parse(content) as SiteAnalysisResult;
  if (!parsed.personas?.length) {
    throw new Error("OpenAI returned no buyer personas");
  }
  if (!parsed.brand?.companyName) {
    throw new Error("OpenAI returned no brand identity");
  }

  parsed.personas = parsed.personas.map((p) => {
    const econ = normalizePersonaEconomics(
      {
        dealSizeMinUsd: p.dealSizeMinUsd,
        dealSizeMaxUsd: p.dealSizeMaxUsd,
        pricingModel: p.pricingModel,
      },
      p.name,
    );
    return { ...p, ...econ };
  });

  return parsed;
}

export async function generateEmailSequence(
  productSummary: string,
  persona: PersonaResult,
): Promise<{ subject: string; touches: { step: number; body: string }[] }> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Write a cold email sequence. Return JSON:
{"subject": "...", "touches": [{"step": 1, "body": "..."}, {"step": 2, "body": "..."}, {"step": 3, "body": "..."}]}`,
      },
      {
        role: "user",
        content: `Product: ${productSummary}\nPersona: ${persona.name}\nAngle: ${persona.messagingAngle}\nPain points: ${persona.painPoints.join(", ")}`,
      },
    ],
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no email sequence");

  const parsed = JSON.parse(content) as {
    subject: string;
    touches: { step: number; body: string }[];
  };
  if (!parsed.subject || !parsed.touches?.length) {
    throw new Error("OpenAI returned an invalid email sequence");
  }
  return parsed;
}

export async function generateCaption(
  brand: BrandContext,
  persona: PersonaResult,
): Promise<string> {
  const client = getClient();
  const socialBlock = brand.socialStudy
    ? `\n\nEXISTING BRAND SOCIAL POSTS (study and match this voice — do not sound generic):\n${formatSocialStudyForPrompt(brand.socialStudy)}`
    : "";

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "Write a compelling social media caption (max 280 chars). Match the brand's EXISTING post voice from the social study — same tone, emoji habits, and themes as their real posts. Return only the caption text.",
      },
      {
        role: "user",
        content: `Brand: ${brand.companyName} (${brand.siteUrl})
Tagline: ${brand.tagline}
Product: ${brand.productSummary}
Persona: ${persona.name}
Angle: ${persona.messagingAngle}
Tone: ${persona.contentTone}${socialBlock}`,
      },
    ],
    temperature: 0.75,
  });

  const caption = response.choices[0]?.message?.content?.trim();
  if (!caption) throw new Error("OpenAI returned no caption");
  return caption;
}

export async function generatePosterBytes(
  brand: BrandContext,
  persona: PersonaResult,
): Promise<Uint8Array> {
  const client = getClient();
  const model = optionalEnv("OPENAI_IMAGE_MODEL") ?? "gpt-image-1";

  const colorList = brand.primaryColors.join(", ");
  const socialBlock = brand.socialStudy
    ? `

THEIR EXISTING SOCIAL CONTENT (match this look — study before creating):
${formatSocialStudyForPrompt(brand.socialStudy)}`
    : "";

  const prompt = `On-brand social media marketing poster for "${brand.companyName}" (${brand.siteUrl}).

BRAND IDENTITY — follow exactly:
- Company: ${brand.companyName}
- Tagline vibe: ${brand.tagline}
- Brand colors (use prominently in background, accents, and lighting): ${colorList}
- Visual style: ${brand.visualStyle}
- Brand imagery/motifs: ${brand.imageryNotes}${socialBlock}

CAMPAIGN (persona-specific layer):
- Target persona: ${persona.name}
- Message: ${persona.messagingAngle}
- Art direction: ${persona.posterStyle}
- Product context: ${brand.productSummary}

The poster must look like it belongs in this brand's EXISTING social feed — same photography style, color grading, and subject matter as their real posts. Not a generic stock template. Persona-specific mood is OK but brand recognition comes first.

Square 1:1 ad layout. Professional, polished, eye-catching. NO readable text, letters, words, or logos in the image.`;

  const response = await client.images.generate({
    model,
    prompt,
    n: 1,
    size: "1024x1024",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`OpenAI image model "${model}" returned no image data`);
  }

  return Uint8Array.from(Buffer.from(b64, "base64"));
}

const platformCaptionLimits: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
};

export async function reviseCaption(args: {
  currentCaption: string;
  instructions: string;
  brand: BrandContext;
  persona: PersonaResult;
  platform: "linkedin" | "twitter" | "instagram";
}): Promise<string> {
  const client = getClient();
  const maxLen = platformCaptionLimits[args.platform] ?? 280;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You edit social media captions. Platform: ${args.platform}. Max ${maxLen} characters.

Rules:
- Apply ONLY the user's requested changes
- Keep the rest of the caption intact unless they ask for a full rewrite
- Preserve brand voice and factual claims
- Return ONLY the final caption text — no quotes, labels, or explanation`,
      },
      {
        role: "user",
        content: `Current caption:
${args.currentCaption}

Changes to make:
${args.instructions}`,
      },
    ],
    temperature: 0.5,
  });

  let caption = response.choices[0]?.message?.content?.trim() ?? "";
  caption = caption.replace(/^["']|["']$/g, "").trim();
  if (!caption) throw new Error("OpenAI returned no revised caption");
  return caption.slice(0, maxLen);
}

export async function editPosterBytes(args: {
  instructions: string;
  imageBytes: Buffer;
  brand: BrandContext;
  persona: PersonaResult;
}): Promise<Uint8Array> {
  const client = getClient();
  const model = optionalEnv("OPENAI_IMAGE_MODEL") ?? "gpt-image-1";
  const colorList = args.brand.primaryColors.join(", ");

  const prompt = `Edit this ${args.brand.companyName} social media poster.

Make these changes: ${args.instructions}

Keep: brand colors (${colorList}), ${args.brand.visualStyle} style, ${args.persona.posterStyle} art direction, and overall on-brand look unless a change requires otherwise.

Do not add readable text, letters, words, or logos.`;

  const imageFile = await toFile(args.imageBytes, "poster.png", {
    type: "image/png",
  });

  const response = await client.images.edit({
    model,
    image: imageFile,
    prompt,
    size: "1024x1024",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`OpenAI image model "${model}" returned no edited image`);
  }

  return Uint8Array.from(Buffer.from(b64, "base64"));
}

export async function revisePosterBytes(args: {
  instructions: string;
  brand: BrandContext;
  persona: PersonaResult;
  imageBytes?: Buffer;
  currentPosterUrl?: string;
}): Promise<Uint8Array> {
  let imageBytes = args.imageBytes;
  if (!imageBytes && args.currentPosterUrl) {
    const response = await fetch(args.currentPosterUrl);
    if (response.ok) {
      imageBytes = Buffer.from(await response.arrayBuffer());
    }
  }

  if (imageBytes) {
    return editPosterBytes({
      instructions: args.instructions,
      imageBytes,
      brand: args.brand,
      persona: args.persona,
    });
  }

  const client = getClient();
  const model = optionalEnv("OPENAI_IMAGE_MODEL") ?? "gpt-image-1";
  const colorList = args.brand.primaryColors.join(", ");

  const prompt = `On-brand social media poster for ${args.brand.companyName}.
Colors: ${colorList}. Style: ${args.brand.visualStyle}. Persona: ${args.persona.name}.
Changes: ${args.instructions}
Square 1:1. NO readable text or logos.`;

  const response = await client.images.generate({
    model,
    prompt,
    n: 1,
    size: "1024x1024",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`OpenAI image model "${model}" returned no image data`);
  }

  return Uint8Array.from(Buffer.from(b64, "base64"));
}
