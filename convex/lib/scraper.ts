export type SiteMeta = {
  title?: string;
  description?: string;
  themeColor?: string;
  ogImage?: string;
  logoUrl?: string;
};

export type SiteScrapeResult = {
  text: string;
  meta: SiteMeta;
  html: string;
};

function readMetaContent(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function resolveUrl(baseUrl: string, maybeRelative?: string): string | undefined {
  if (!maybeRelative) return undefined;
  try {
    return new URL(maybeRelative, baseUrl).href;
  } catch {
    return maybeRelative;
  }
}

export function extractSiteMeta(html: string, baseUrl: string): SiteMeta {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  const description =
    readMetaContent(html, "description") ??
    readMetaContent(html, "og:description");
  const themeColor = readMetaContent(html, "theme-color");
  const ogImage = resolveUrl(
    baseUrl,
    readMetaContent(html, "og:image") ??
      readMetaContent(html, "twitter:image"),
  );

  return { title, description, themeColor, ogImage, logoUrl: extractBrandLogoUrl(html, baseUrl) };
}

export function extractBrandLogoUrl(
  html: string,
  baseUrl: string,
): string | undefined {
  const candidates = [
    readMetaContent(html, "og:logo"),
    html.match(
      /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
    )?.[1],
    html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i,
    )?.[1],
    html.match(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i)?.[1],
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']icon["']/i)?.[1],
    html.match(
      /<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
    )?.[1],
    html.match(
      /<img[^>]+src=["']([^"']+)["'][^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["']/i,
    )?.[1],
  ];

  for (const candidate of candidates) {
    const resolved = resolveUrl(baseUrl, candidate);
    if (resolved) return resolved;
  }

  return undefined;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function scrapeWebsite(url: string): Promise<SiteScrapeResult> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AutogrowBot/1.0; +https://autogrow.dev)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return {
      text: htmlToText(html).slice(0, 12000),
      meta: extractSiteMeta(html, url),
      html: html.slice(0, 250_000),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to scrape ${url}: ${message}`);
  }
}
