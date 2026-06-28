export type SocialProfileLink = {
  platform: string;
  url: string;
};

export type BrandSocialStudy = {
  profiles: SocialProfileLink[];
  samplePosts: Array<{ platform: string; text: string; source?: string }>;
  captionVoice: string;
  visualPatterns: string;
  contentThemes: string[];
  hashtags: string[];
};

const SOCIAL_HOSTS: Array<{ platform: string; pattern: RegExp }> = [
  { platform: "instagram", pattern: /instagram\.com/i },
  { platform: "linkedin", pattern: /linkedin\.com/i },
  { platform: "x", pattern: /(?:twitter|x)\.com/i },
  { platform: "facebook", pattern: /facebook\.com/i },
  { platform: "tiktok", pattern: /tiktok\.com/i },
];

export function extractSocialLinks(
  html: string,
  baseUrl: string,
): SocialProfileLink[] {
  const found = new Map<string, SocialProfileLink>();
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefPattern.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:")) continue;

    let absolute: string;
    try {
      absolute = new URL(raw, baseUrl).href;
    } catch {
      continue;
    }

    for (const { platform, pattern } of SOCIAL_HOSTS) {
      if (!pattern.test(absolute)) continue;
      if (/\/share|\/intent|\/sharer|\/dialog/i.test(absolute)) continue;
      const key = `${platform}:${absolute.split("?")[0]}`;
      if (!found.has(key)) {
        found.set(key, { platform, url: absolute.split("?")[0]! });
      }
    }
  }

  return Array.from(found.values()).slice(0, 6);
}

export function formatSocialStudyForPrompt(study: BrandSocialStudy): string {
  const posts = study.samplePosts
    .slice(0, 6)
    .map(
      (p, i) =>
        `${i + 1}. [${p.platform}] ${p.text}${p.source ? ` (${p.source})` : ""}`,
    )
    .join("\n");

  return [
    study.profiles.length
      ? `Profiles: ${study.profiles.map((p) => `${p.platform}: ${p.url}`).join(", ")}`
      : "",
    `Caption voice: ${study.captionVoice}`,
    `Visual patterns from their posts: ${study.visualPatterns}`,
    study.contentThemes.length
      ? `Themes they post about: ${study.contentThemes.join(", ")}`
      : "",
    study.hashtags.length ? `Hashtags they use: ${study.hashtags.join(" ")}` : "",
    posts ? `Sample posts we studied:\n${posts}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
