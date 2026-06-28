"use node";

import { Composio } from "@composio/core";
import {
  getComposioUserId,
  hasComposioProjectApiKey,
  isComposioConfigured,
  isComposioMcpConfigured,
  isComposioSdkConfigured,
  optionalEnv,
  requireEnv,
} from "./env";
import {
  getConnectUrlViaProjectSdk,
} from "./composioProjectSdk";
import {
  getAllConnectionStatesMcp,
  getConnectUrlMcp,
  getConnectionStateMcp,
  listLinkedInAccountsMcp,
  publishLinkedInPostMcp,
  waitForConnectionMcp,
  removeAccountMcp,
  type SocialAccountDetails,
  type SocialConnectionState,
  type SocialToolkit,
} from "./composioMcp";
import type { PosterImage } from "./posterImage";
import { fetchPosterFromUrl } from "./posterImage";
import { uploadPosterToComposioApi } from "./composioFileUpload";

export type { SocialAccountDetails, SocialConnectionState, SocialToolkit };
export {
  getAllConnectionStatesMcp,
  getConnectionStateMcp,
  waitForConnectionMcp,
  removeAccountMcp,
};

let client: Composio | null = null;

function getClient(): Composio {
  if (!client) {
    client = new Composio({ apiKey: requireEnv("COMPOSIO_API_KEY") });
  }
  return client;
}

export function checkComposioConfigured(): boolean {
  return isComposioConfigured();
}

export function getLinkedInAuthConfigId(): string {
  return requireEnv("COMPOSIO_LINKEDIN_AUTH_CONFIG_ID");
}

export { getComposioUserId };

type LinkedInAccount = {
  id: string;
  status: string;
};

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

function extractLinkedInPersonId(payload: unknown): string | undefined {
  const root = asRecord(payload);
  if (!root) return undefined;

  const nested = asRecord(root.data) ?? asRecord(root.response_data);
  const profile = asRecord(nested?.profile) ?? nested ?? root;

  return pickString(
    profile?.id,
    profile?.sub,
    profile?.personId,
    root.id,
    nested?.id,
  );
}

function extractExternalPostId(payload: unknown): string | undefined {
  const root = asRecord(payload);
  if (!root) return undefined;

  const nested = asRecord(root.data) ?? asRecord(root.response_data);
  return pickString(
    nested?.id,
    nested?.postId,
    nested?.post_id,
    root.id,
    root.postId,
  );
}

async function listLinkedInAccountsSdk(): Promise<LinkedInAccount[]> {
  const composio = getClient();
  const response = await composio.connectedAccounts.list({
    userIds: [getComposioUserId()],
    toolkitSlugs: ["linkedin"],
    statuses: ["ACTIVE"],
  });

  return response.items.map((item) => ({
    id: item.id,
    status: item.status,
  }));
}

export async function listLinkedInAccounts(): Promise<SocialAccountDetails[]> {
  if (isComposioMcpConfigured()) {
    return listLinkedInAccountsMcp();
  }
  return listLinkedInAccountsSdk();
}

export async function getConnectUrl(
  callbackUrl?: string,
  toolkit: SocialToolkit = "linkedin",
): Promise<string> {
  if (hasComposioProjectApiKey()) {
    return getConnectUrlViaProjectSdk(toolkit, callbackUrl);
  }

  if (isComposioMcpConfigured()) {
    return getConnectUrlMcp(toolkit);
  }

  if (toolkit !== "linkedin") {
    throw new Error(`${toolkit} connect requires Composio Connect (consumer key)`);
  }

  const composio = getClient();
  const connectionRequest = await composio.connectedAccounts.link(
    getComposioUserId(),
    getLinkedInAuthConfigId(),
    callbackUrl ? { callbackUrl } : undefined,
  );

  if (!connectionRequest.redirectUrl) {
    throw new Error("Composio did not return a Connect Link URL");
  }

  return connectionRequest.redirectUrl;
}

async function getLinkedInAuthorUrnSdk(
  connectedAccountId: string,
): Promise<string> {
  const composio = getClient();
  const result = await composio.tools.execute("LINKEDIN_GET_MY_INFO", {
    userId: getComposioUserId(),
    connectedAccountId,
    dangerouslySkipVersionCheck: true,
  });

  const personId = extractLinkedInPersonId(result.data ?? result);
  if (!personId) {
    throw new Error("Could not resolve LinkedIn author URN from profile");
  }

  return personId.startsWith("urn:li:")
    ? personId
    : `urn:li:person:${personId}`;
}

async function publishLinkedInPostSdk(params: {
  caption: string;
  posterUrl?: string;
  posterImage?: PosterImage;
  connectedAccountId?: string;
}): Promise<{ externalPostId?: string }> {
  const composio = getClient();
  const userId = getComposioUserId();

  const accounts = await listLinkedInAccountsSdk();
  const connectedAccountId =
    params.connectedAccountId ??
    accounts[0]?.id ??
    optionalEnv("COMPOSIO_LINKEDIN_CONNECTED_ACCOUNT_ID");

  if (!connectedAccountId) {
    throw new Error("LinkedIn is not connected. Connect your account first.");
  }

  const author = await getLinkedInAuthorUrnSdk(connectedAccountId);

  const toolArgs: Record<string, unknown> = {
    author,
    commentary: params.caption,
    lifecycleState: "PUBLISHED",
    visibility: "PUBLIC",
  };

  if (params.posterUrl || params.posterImage) {
    const image =
      params.posterImage ??
      (await fetchPosterFromUrl(params.posterUrl!));
    const fileDescriptor = await uploadPosterToComposioApi(image);
    toolArgs.images = [fileDescriptor];
  }

  const result = await composio.tools.execute(
    "LINKEDIN_CREATE_LINKED_IN_POST",
    {
      userId,
      connectedAccountId,
      arguments: toolArgs,
      dangerouslySkipVersionCheck: true,
    },
  );

  return {
    externalPostId: extractExternalPostId(result.data ?? result),
  };
}

export async function publishLinkedInPost(params: {
  caption: string;
  posterUrl?: string;
  posterImage?: PosterImage;
  connectedAccountId?: string;
}): Promise<{ externalPostId?: string }> {
  if (isComposioMcpConfigured()) {
    return publishLinkedInPostMcp({
      caption: params.caption,
      posterUrl: params.posterUrl,
      posterImage: params.posterImage,
    });
  }
  if (isComposioSdkConfigured()) {
    return publishLinkedInPostSdk(params);
  }
  throw new Error("Composio is not configured");
}

async function removeSocialAccountSdk(accountId: string): Promise<void> {
  const composio = getClient();
  await composio.connectedAccounts.delete(accountId);
}

export async function removeSocialAccount(
  toolkit: SocialToolkit,
  accountId: string,
): Promise<SocialConnectionState | null> {
  if (isComposioMcpConfigured()) {
    return removeAccountMcp(toolkit, accountId);
  }
  if (isComposioSdkConfigured()) {
    if (toolkit !== "linkedin") {
      throw new Error(`${toolkit} disconnect requires Composio Connect (consumer key)`);
    }
    await removeSocialAccountSdk(accountId);
    const accounts = await listLinkedInAccountsSdk();
    return {
      toolkit,
      connected: accounts.length > 0,
      pending: false,
      accounts,
      activeAccounts: accounts,
      staleAccounts: [],
      accountId: accounts[0]?.id,
      primaryAccount: accounts[0],
    };
  }
  throw new Error("Composio is not configured");
}
