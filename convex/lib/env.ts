export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(
      `Missing ${name}. Add it to .env.local then run: npm run env:sync`,
    );
  }
  return value.trim();
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() || undefined;
}

/** Postiz is optional — without it, posts stay in Launchpad's calendar as drafts. */
export function isPostizConfigured(): boolean {
  return Boolean(
    optionalEnv("POSTIZ_API_KEY") && optionalEnv("POSTIZ_BASE_URL"),
  );
}

/** Composio Connect MCP — consumer key from AI Clients dashboard (ck_...). */
export function isComposioMcpConfigured(): boolean {
  return Boolean(optionalEnv("COMPOSIO_CONSUMER_API_KEY")?.startsWith("ck_"));
}

/** Legacy SDK path — project API key + LinkedIn auth config. */
export function isComposioSdkConfigured(): boolean {
  return Boolean(
    optionalEnv("COMPOSIO_API_KEY") &&
      optionalEnv("COMPOSIO_LINKEDIN_AUTH_CONFIG_ID"),
  );
}

/** Composio is optional — LinkedIn publishing via MCP or SDK. */
export function isComposioConfigured(): boolean {
  return (
    isComposioMcpConfigured() ||
    isComposioSdkConfigured() ||
    hasComposioProjectApiKey()
  );
}

export function hasComposioProjectApiKey(): boolean {
  const key = optionalEnv("COMPOSIO_API_KEY");
  return Boolean(key && !key.startsWith("ck_"));
}

export function getDashboardConnectAppUrl(
  toolkit: "linkedin" | "twitter" | "instagram",
): string {
  const workspace =
    optionalEnv("COMPOSIO_DASHBOARD_WORKSPACE") ?? "mdadnan456_workspace";
  return `https://dashboard.composio.dev/${workspace}/~/connect/apps/${toolkit}`;
}

export function getComposioUserId(): string {
  return optionalEnv("COMPOSIO_USER_ID") ?? "launchpad-demo";
}

export function getToolkitAuthConfigOverride(
  toolkit: "linkedin" | "twitter" | "instagram",
): string | undefined {
  switch (toolkit) {
    case "twitter":
      return optionalEnv("COMPOSIO_TWITTER_AUTH_CONFIG_ID");
    case "instagram":
      return optionalEnv("COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID");
    default:
      return undefined;
  }
}

export function getToolkitConnectInfo(
  toolkit: "linkedin" | "twitter" | "instagram",
): {
  connectAvailable: boolean;
  setupMessage?: string;
  dashboardConnectUrl: string;
} {
  const dashboardConnectUrl = getDashboardConnectAppUrl(toolkit);

  if (
    toolkit === "twitter" &&
    !getToolkitAuthConfigOverride("twitter") &&
    !hasComposioProjectApiKey()
  ) {
    return { connectAvailable: true, dashboardConnectUrl };
  }

  return { connectAvailable: true, dashboardConnectUrl };
}

/** Orange Slice SDK expects ORANGESLICE_API_KEY; ORANGE_SLICE_API_KEY is kept for compatibility. */
export function getOrangeSliceApiKey(): string {
  const key =
    optionalEnv("ORANGESLICE_API_KEY") ?? optionalEnv("ORANGE_SLICE_API_KEY");
  if (!key) {
    throw new Error(
      "Missing ORANGESLICE_API_KEY. Run `npx orangeslice@latest login`, then `npm run orangeslice:import` and `npm run env:sync`.",
    );
  }
  return key;
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.text();
    return body ? `${response.status}: ${body}` : String(response.status);
  } catch {
    return String(response.status);
  }
}

export async function assertOk(response: Response, service: string): Promise<Response> {
  if (!response.ok) {
    throw new Error(`${service} request failed: ${await readApiError(response)}`);
  }
  return response;
}
