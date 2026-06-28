"use node";

import {
  getComposioUserId,
  getToolkitAuthConfigOverride,
  getToolkitConnectInfo,
  requireEnv,
} from "./env";
import type { PosterImage } from "./posterImage";
import { fetchPosterFromUrl } from "./posterImage";

const MCP_URL = "https://connect.composio.dev/mcp";

export const SOCIAL_TOOLKITS = ["linkedin", "twitter", "instagram"] as const;
export type SocialToolkit = (typeof SOCIAL_TOOLKITS)[number];

type McpEnvelope = {
  data?: unknown;
  error?: string | null;
  successful?: boolean;
};

export type SocialAccountDetails = {
  id: string;
  status: string;
  name?: string;
  email?: string;
  handle?: string;
  isDefault?: boolean;
  accountType?: string;
};

export type SocialConnectionState = {
  toolkit: SocialToolkit;
  connected: boolean;
  pending: boolean;
  accounts: SocialAccountDetails[];
  activeAccounts: SocialAccountDetails[];
  staleAccounts: SocialAccountDetails[];
  accountId?: string;
  primaryAccount?: SocialAccountDetails;
};

function getConsumerKey(): string {
  return requireEnv("COMPOSIO_CONSUMER_API_KEY");
}

function parseSsePayload(raw: string): unknown {
  for (const line of raw.split("\n")) {
    if (line.startsWith("data: ")) {
      return JSON.parse(line.slice(6));
    }
  }
  throw new Error(`Invalid Composio MCP response: ${raw.slice(0, 200)}`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<McpEnvelope> {
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "x-consumer-api-key": getConsumerKey(),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`Composio MCP HTTP ${response.status}`);
  }

  const envelope = parseSsePayload(await response.text()) as {
    result?: { content?: Array<{ text?: string }>; isError?: boolean };
    error?: { message?: string };
  };

  if (envelope.error?.message) {
    throw new Error(envelope.error.message);
  }

  const text = envelope.result?.content?.[0]?.text;
  if (!text) {
    throw new Error("Composio MCP returned an empty response");
  }

  const parsed = JSON.parse(text) as McpEnvelope;
  if (parsed.successful === false && parsed.error) {
    throw new Error(String(parsed.error));
  }

  return parsed;
}

function toolkitResult(
  data: unknown,
  toolkit: SocialToolkit,
): Record<string, unknown> | null {
  const root = asRecord(data);
  const results = asRecord(root?.results);
  return asRecord(results?.[toolkit]);
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

function isActiveStatus(status: string): boolean {
  const normalized = normalizeStatus(status);
  return normalized === "active" || normalized === "connected";
}

function parseUserInfo(raw: unknown): Pick<
  SocialAccountDetails,
  "name" | "email" | "handle"
> {
  const info = asRecord(raw);
  if (!info) return {};

  const givenName = pickString(info.given_name);
  const familyName = pickString(info.family_name);
  const composedName = [givenName, familyName].filter(Boolean).join(" ").trim();

  return {
    name: pickString(info.name, info.display_name, composedName, info.full_name),
    email: pickString(info.email),
    handle: pickString(
      info.username,
      info.screen_name,
      info.preferred_username,
      info.vanity_name,
    ),
  };
}

function parseAccounts(raw: unknown): SocialAccountDetails[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const account = asRecord(item);
      const id = pickString(account?.id);
      const status = pickString(account?.status);
      if (!id || !status) return null;

      const profile = parseUserInfo(account?.user_info);
      const details: SocialAccountDetails = {
        id,
        status,
        ...profile,
        accountType: pickString(account?.account_type),
      };
      if (account?.is_default === true) {
        details.isDefault = true;
      }
      return details;
    })
    .filter((item): item is SocialAccountDetails => item !== null);
}

function pickPrimaryAccount(
  accounts: SocialAccountDetails[],
): SocialAccountDetails | undefined {
  const active = accounts.filter((account) => isActiveStatus(account.status));
  if (active.length === 0) return undefined;
  return active.find((account) => account.isDefault) ?? active[0];
}

export async function listAccountsMcp(
  toolkit: SocialToolkit,
  activeOnly = false,
): Promise<SocialAccountDetails[]> {
  const userId = getComposioUserId();
  const response = await callMcpTool("COMPOSIO_MANAGE_CONNECTIONS", {
    session_id: userId,
    toolkits: [{ name: toolkit, action: "list" }],
  });

  const accounts = parseAccounts(toolkitResult(response.data, toolkit)?.accounts);
  if (!activeOnly) return accounts;
  return accounts.filter((account) => isActiveStatus(account.status));
}

export async function getConnectionStateMcp(
  toolkit: SocialToolkit,
): Promise<SocialConnectionState> {
  const accounts = await listAccountsMcp(toolkit);
  const active = accounts.filter((account) => isActiveStatus(account.status));
  const primaryAccount = pickPrimaryAccount(accounts);

  return {
    toolkit,
    connected: active.length > 0,
    pending: false,
    accounts: active,
    activeAccounts: active,
    staleAccounts: [],
    accountId: primaryAccount?.id,
    primaryAccount,
  };
}

export async function waitForConnectionMcp(
  toolkit: SocialToolkit,
  timeoutMs = 120_000,
): Promise<SocialConnectionState> {
  const userId = getComposioUserId();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const state = await getConnectionStateMcp(toolkit);
    if (state.connected) return state;

    await callMcpTool("COMPOSIO_WAIT_FOR_CONNECTIONS", {
      session_id: userId,
      toolkits: [toolkit],
    }).catch(() => undefined);

    const refreshed = await getConnectionStateMcp(toolkit);
    if (refreshed.connected) return refreshed;
    if (!refreshed.pending) return refreshed;

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return getConnectionStateMcp(toolkit);
}

export async function getAllConnectionStatesMcp(): Promise<SocialConnectionState[]> {
  return Promise.all(SOCIAL_TOOLKITS.map((toolkit) => getConnectionStateMcp(toolkit)));
}

export async function getConnectUrlMcp(toolkit: SocialToolkit): Promise<string> {
  const connectInfo = getToolkitConnectInfo(toolkit);
  if (!connectInfo.connectAvailable) {
    throw new Error(
      connectInfo.setupMessage ??
        `Connect is not available for ${toolkit} yet.`,
    );
  }

  const userId = getComposioUserId();
  const toolkitItem: Record<string, unknown> = { name: toolkit, action: "add" };
  const authConfigOverride = getToolkitAuthConfigOverride(toolkit);
  if (authConfigOverride) {
    toolkitItem.auth_config_override = authConfigOverride;
  }

  const response = await callMcpTool("COMPOSIO_MANAGE_CONNECTIONS", {
    session_id: userId,
    toolkits: [toolkitItem],
  });

  const result = toolkitResult(response.data, toolkit);
  const status = pickString(result?.status);
  if (status && normalizeStatus(status) === "failed") {
    throw new Error(
      pickString(result?.error_message) ??
        `Composio could not start ${toolkit} connect`,
    );
  }

  const redirectUrl = pickString(result?.redirect_url);
  if (redirectUrl) return redirectUrl;

  const active = await listAccountsMcp(toolkit, true);
  if (active.length > 0) {
    throw new Error(`${toolkit} is already connected`);
  }

  throw new Error("Composio did not return a Connect Link URL");
}

function extractPersonUrn(toolResult: unknown): string | undefined {
  const root = asRecord(toolResult);
  const results = root?.results;
  if (!Array.isArray(results) || results.length === 0) return undefined;

  const first = asRecord(results[0]);
  const response = asRecord(first?.response) ?? asRecord(first?.data);
  const nested = asRecord(response?.data) ?? response;

  const id = pickString(
    nested?.id,
    nested?.sub,
    asRecord(nested?.profile)?.id,
  );
  if (!id) return undefined;
  return id.startsWith("urn:li:") ? id : `urn:li:person:${id}`;
}

function extractPostId(toolResult: unknown): string | undefined {
  const root = asRecord(toolResult);
  const results = root?.results;
  if (!Array.isArray(results) || results.length === 0) return undefined;

  const first = asRecord(results[0]);
  const response = asRecord(first?.response) ?? asRecord(first?.data);
  const nested = asRecord(response?.data) ?? response;
  return pickString(
    nested?.id,
    nested?.postId,
    nested?.post_id,
    nested?.x_restli_id,
  );
}

type ComposioFileDescriptor = {
  name: string;
  mimetype: string;
  s3key: string;
};

function extensionForContentType(contentType: string): {
  ext: string;
  mimetype: string;
} {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return { ext: "jpg", mimetype: "image/jpeg" };
  }
  if (contentType.includes("webp")) {
    return { ext: "webp", mimetype: "image/webp" };
  }
  return { ext: "png", mimetype: "image/png" };
}

function escapePythonString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function extractComposioS3Key(data: unknown): string {
  const root = asRecord(data);
  const stdout = pickString(root?.stdout) ?? "";
  const markerMatch = stdout.match(/COMPOSIO_S3KEY:([^\s\n]+)/);
  if (markerMatch?.[1]) return markerMatch[1];

  const refMatch = stdout.match(/Reference S3 Key \(s3key\): ([^\s\n]+)/);
  if (refMatch?.[1]) return refMatch[1];

  const error = pickString(root?.error);
  if (error) {
    throw new Error(`Composio file upload failed: ${error}`);
  }

  throw new Error("Composio file upload did not return an s3key");
}

async function uploadPosterToComposioMcp(
  image: PosterImage,
  options?: { sourceUrl?: string },
): Promise<ComposioFileDescriptor> {
  const userId = getComposioUserId();
  const { ext, mimetype } = extensionForContentType(image.contentType);
  const filename = `poster.${ext}`;

  let code: string;
  if (options?.sourceUrl) {
    const url = escapePythonString(options.sourceUrl);
    code = `
import requests
r = requests.get('${url}', timeout=60)
r.raise_for_status()
path = '/tmp/${filename}'
with open(path, 'wb') as f:
    f.write(r.content)
uploaded, _ = upload_local_file(path)
print('COMPOSIO_S3KEY:' + uploaded['s3key'])
`;
  } else {
    const encoded = Buffer.from(image.bytes).toString("base64");
    code = `
import base64
raw = base64.b64decode('${encoded}')
path = '/tmp/${filename}'
with open(path, 'wb') as f:
    f.write(raw)
uploaded, _ = upload_local_file(path)
print('COMPOSIO_S3KEY:' + uploaded['s3key'])
`;
  }

  const response = await callMcpTool("COMPOSIO_REMOTE_WORKBENCH", {
    session_id: userId,
    code_to_execute: code,
  });

  const s3key = extractComposioS3Key(response.data);
  return { name: filename, mimetype, s3key };
}

async function executeTool(
  toolSlug: string,
  arguments_: Record<string, unknown>,
): Promise<unknown> {
  const userId = getComposioUserId();
  const response = await callMcpTool("COMPOSIO_MULTI_EXECUTE_TOOL", {
    session_id: userId,
    tools: [{ tool_slug: toolSlug, arguments: arguments_ }],
  });

  const data = asRecord(response.data);
  const results = data?.results;
  if (Array.isArray(results)) {
    const first = asRecord(results[0]);
    const error = pickString(first?.error);
    if (error) throw new Error(error);

    const toolResponse = asRecord(first?.response);
    if (toolResponse?.successful === false) {
      const responseData = asRecord(toolResponse.data);
      throw new Error(
        pickString(responseData?.message, toolResponse.error) ??
          "Composio tool execution failed",
      );
    }
  }

  return response.data;
}

export async function removeAccountMcp(
  toolkit: SocialToolkit,
  accountId: string,
): Promise<SocialConnectionState> {
  const userId = getComposioUserId();
  await callMcpTool("COMPOSIO_MANAGE_CONNECTIONS", {
    session_id: userId,
    toolkits: [{ name: toolkit, action: "remove", account_id: accountId }],
  });

  return getConnectionStateMcp(toolkit);
}

export async function listLinkedInAccountsMcp(): Promise<SocialAccountDetails[]> {
  return listAccountsMcp("linkedin", true);
}

export async function publishLinkedInPostMcp(params: {
  caption: string;
  posterUrl?: string;
  posterImage?: PosterImage;
}): Promise<{ externalPostId?: string }> {
  const active = await listLinkedInAccountsMcp();
  if (active.length === 0) {
    throw new Error("LinkedIn is not connected. Connect your account first.");
  }

  const profileData = await executeTool("LINKEDIN_GET_MY_INFO", {});
  const author = extractPersonUrn(profileData);
  if (!author) {
    throw new Error("Could not resolve LinkedIn author URN");
  }

  const postArgs: Record<string, unknown> = {
    author,
    commentary: params.caption,
    lifecycleState: "PUBLISHED",
    visibility: "PUBLIC",
  };

  const image =
    params.posterImage ??
    (params.posterUrl ? await fetchPosterFromUrl(params.posterUrl) : undefined);

  if (image) {
    let fileDescriptor: ComposioFileDescriptor;
    try {
      fileDescriptor = await uploadPosterToComposioMcp(image, {
        sourceUrl: params.posterUrl,
      });
    } catch (error) {
      if (!params.posterUrl) throw error;
      fileDescriptor = await uploadPosterToComposioMcp(image);
    }
    postArgs.images = [fileDescriptor];
  }

  const postData = await executeTool("LINKEDIN_CREATE_LINKED_IN_POST", postArgs);

  return { externalPostId: extractPostId(postData) };
}
