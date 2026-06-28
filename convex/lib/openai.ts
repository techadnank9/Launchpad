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
  logoUrl?: string;
};

export type CampaignContext = {
  key: string;
  label: string;
  posterBrief: string;
  captionHook: string;
};

function formatBrandColorBrief(colors: string[]): string {
  const lines = colors.map((color, index) => {
    const role =
      index === 0 ? "Primary" : index === 1 ? "Secondary" : `Accent ${index}`;
    return `- ${role}: ${color}`;
  });

  return `BRAND COLOR PALETTE (mandatory — at least 60% of the image must use these exact colors):
${lines.join("\n")}
Use them for backgrounds, gradients, props, wardrobe, lighting gels, and UI accents.
Do NOT introduce off-brand palettes or clashing hues unless the user explicitly asked for a holiday motif layered on top.`;
}

function formatCampaignBlock(campaign?: CampaignContext): string {
  if (!campaign || campaign.key === "evergreen") return "";
  return `

SEASONAL EVENT CAMPAIGN — "${campaign.label}":
- Creative direction: ${campaign.posterBrief}
- Caption angle: ${campaign.captionHook}
- The post must feel timely for ${campaign.label} while staying unmistakably on-brand.`;
}

function formatPhotographyStyleBlock(): string {
  return `VISUAL MEDIUM (strict — violations fail the brief):
- Photorealistic editorial or lifestyle PHOTOGRAPHY only
- NO animation, illustration, cartoon, anime, vector art, clip-art, or comic style
- NO 3D renders, CGI, Unreal/Octane look, glowing UI mockups, or sci-fi holograms
- NO SaaS dashboard screenshots, icon grids, org-chart diagrams, or "HR / IT / Finance" connector graphics
- NO exaggerated motion, particle effects, or "animated" marketing graphics
- Real environments, natural lighting, believable depth of field like a professional brand photoshoot`;
}

function formatIntegratedBrandBlock(brand: BrandContext): string {
  const colorBrief = formatBrandColorBrief(brand.primaryColors);
  return `BRAND INTEGRATION (mandatory — must feel shot for ${brand.companyName}, not a template with a logo pasted on):
${colorBrief}
- Color-grade the ENTIRE frame in this palette — walls, light, wardrobe, props, sky
- "${brand.companyName}" appears ONCE as natural in-scene typography (office signage, notebook, tote, conference room wall, phone lock screen blur) — elegant, readable, NOT a footer strip or banner
- Visual identity cues: ${brand.imageryNotes}
- Match brand mood: ${brand.visualStyle}
- NO full-width bottom bar, NO logo slab, NO empty "safe zone" reserved for post-production branding
- Do NOT invent a fake logo icon — only the company wordmark as environmental type if needed`;
}

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
Each persona posterStyle must reference the brand's colors and imagery while tailoring mood to that persona. Poster art direction must specify photorealistic photography — never illustration or animation.
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

export type EmailTouch = {
  step: number;
  label?: string;
  body: string;
  waitDays?: number;
};

export type LeadPersonalization = {
  firstName: string;
  fullName: string;
  title: string;
  company: string;
  intentSignals: string[];
};

export async function personalizeEmailForLead(args: {
  brand: BrandContext;
  persona: PersonaResult;
  touch: EmailTouch;
  subject: string;
  lead: LeadPersonalization;
  step: number;
}): Promise<{ subject: string; body: string }> {
  const client = getClient();
  const intentHook =
    args.lead.intentSignals[0] ??
    args.persona.painPoints[0] ??
    "their current priorities";

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Rewrite this outbound email for ONE specific person. Return JSON: {"subject":"...","body":"..."}.
- Use their first name in the greeting only
- Reference their title (${args.lead.title}) and company (${args.lead.company}) naturally — not in the subject line
- Weave in this intent signal: ${intentHook}
- Keep the same CTA and sequence role (step ${args.step})
- Quirky, human, 60–120 words — no corporate filler
- Do NOT use placeholders like {first_name}; write the final copy`,
      },
      {
        role: "user",
        content: `From: ${args.brand.companyName}
Persona: ${args.persona.name}
Recipient: ${args.lead.fullName}, ${args.lead.title} @ ${args.lead.company}

Template subject: ${args.subject}
Template body:
${args.touch.body}`,
      },
    ],
    temperature: 0.85,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { subject: args.subject, body: args.touch.body };
  }
  const parsed = JSON.parse(content) as { subject?: string; body?: string };
  return {
    subject: parsed.subject?.trim() || args.subject,
    body: parsed.body?.trim() || args.touch.body,
  };
}

export async function generateEmailSequence(
  brand: BrandContext,
  persona: PersonaResult,
): Promise<{ subject: string; touches: EmailTouch[] }> {
  const client = getClient();
  const socialBlock = brand.socialStudy
    ? `\nBrand social voice (match this energy):\n${formatSocialStudyForPrompt(brand.socialStudy).slice(0, 1200)}`
    : "";

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write outbound email sequences for ${brand.companyName}. Return JSON only:
{"subject":"...","touches":[{"step":1,"label":"Opener","body":"...","waitDays":0},{"step":2,"label":"Follow-up","body":"...","waitDays":3},{"step":3,"label":"Last ping","body":"...","waitDays":3}]}

SEQUENCE STRUCTURE (drip timeline — only touch 1 sends immediately):
- Touch 1 = cold open — hook them in 4 sentences max (waitDays: 0)
- Touch 2 = follow-up — new angle after no reply (waitDays: 3 business days)
- Touch 3 = break-up — short, human close-the-loop (waitDays: 3 business days)

PERSONALIZATION PLACEHOLDERS (use in every body):
- {first_name} in greeting only
- {company} and {title} woven into one sentence naturally
- {intent_signal} — reference a plausible pain based on persona (will be replaced with real signal at send time)

VOICE (strict):
- Quirky, catchy, and VERY specific to this persona's pain — not generic SaaS copy
- Sound like a sharp founder or AE who did their homework, not a marketing blast
- Match tone: ${persona.contentTone}
- Use {first_name} once in the greeting only — also use {company}, {title}, {intent_signal} where natural
- Subject line: short, specific, curiosity or pattern interrupt (under 8 words ideal)
- Each body: 60–120 words, scannable, one clear CTA
- Reference ${brand.companyName} naturally; weave in: ${brand.valueProp}

BANNED: revolutionize, streamline, leverage, synergy, cutting-edge, hope this message finds you, touching base, circle back, game-changer, excited to connect`,
      },
      {
        role: "user",
        content: `Brand: ${brand.companyName} — ${brand.tagline}
Site: ${brand.siteUrl}
Product: ${brand.productSummary}
Value prop: ${brand.valueProp}

Persona: ${persona.name}
Messaging angle: ${persona.messagingAngle}
Pain points: ${persona.painPoints.join("; ")}
Who we target: ${persona.outboundTargets}
${socialBlock}

Write a 3-touch sequence that feels written for ONE real ${persona.name} — not a template.`,
      },
    ],
    temperature: 0.92,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no email sequence");

  const parsed = JSON.parse(content) as {
    subject: string;
    touches: EmailTouch[];
  };
  if (!parsed.subject || !parsed.touches?.length) {
    throw new Error("OpenAI returned an invalid email sequence");
  }
  return parsed;
}

export async function generateCaption(
  brand: BrandContext,
  persona: PersonaResult,
  campaign?: CampaignContext,
): Promise<string> {
  const client = getClient();
  const socialBlock = brand.socialStudy
    ? `\n\nEXISTING BRAND SOCIAL POSTS (study and match this voice — do not sound generic):\n${formatSocialStudyForPrompt(brand.socialStudy)}`
    : "";
  const campaignBlock = campaign ? formatCampaignBlock(campaign) : "";

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
Brand colors: ${brand.primaryColors.join(", ")}
Product: ${brand.productSummary}
Persona: ${persona.name}
Angle: ${persona.messagingAngle}
Tone: ${persona.contentTone}${campaignBlock}${socialBlock}`,
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
  campaign?: CampaignContext,
): Promise<Uint8Array> {
  const client = getClient();
  const model = optionalEnv("OPENAI_IMAGE_MODEL") ?? "gpt-image-1";

  const socialBlock = brand.socialStudy
    ? `

THEIR EXISTING SOCIAL CONTENT (match this look — study before creating):
${formatSocialStudyForPrompt(brand.socialStudy)}`
    : "";
  const campaignBlock = campaign ? formatCampaignBlock(campaign) : "";

  const prompt = `On-brand social media marketing poster for "${brand.companyName}" (${brand.siteUrl}).

${formatIntegratedBrandBlock(brand)}

CAMPAIGN (persona-specific layer):
- Target persona: ${persona.name}
- Message: ${persona.messagingAngle}
- Art direction: ${persona.posterStyle}
- Product context: ${brand.productSummary}${campaignBlock}${socialBlock}

${formatPhotographyStyleBlock()}

The poster must look like it belongs in ${brand.companyName}'s EXISTING social feed — same photography style, color grading, and subject matter as their real posts.

Square 1:1 composition. Brand identity integrated throughout the full frame.`;

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

  const prompt = `Edit this ${args.brand.companyName} social media poster.

Make these changes: ${args.instructions}

${formatIntegratedBrandBlock(args.brand)}
Visual style: ${args.brand.visualStyle}. Art direction: ${args.persona.posterStyle}.
${formatPhotographyStyleBlock()}

Keep brand identity integrated across the full frame — no footer bar or pasted logo slab.`;

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

  const prompt = `On-brand social media poster for ${args.brand.companyName}.
${formatIntegratedBrandBlock(args.brand)}
Style: ${args.brand.visualStyle}. Persona: ${args.persona.name}.
Changes: ${args.instructions}
${formatPhotographyStyleBlock()}
Square 1:1. Brand woven through the full frame — no footer bar.`;

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
