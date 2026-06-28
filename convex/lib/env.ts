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
