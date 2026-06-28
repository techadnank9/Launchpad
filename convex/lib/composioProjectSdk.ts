"use node";

import { Composio } from "@composio/core";
import { getComposioUserId, hasComposioProjectApiKey, requireEnv } from "./env";
import type { SocialToolkit } from "./composioMcp";

let projectClient: Composio | null = null;

function getProjectClient(): Composio {
  if (!projectClient) {
    projectClient = new Composio({ apiKey: requireEnv("COMPOSIO_API_KEY") });
  }
  return projectClient;
}

export async function getConnectUrlViaProjectSdk(
  toolkit: SocialToolkit,
  callbackUrl?: string,
): Promise<string> {
  const composio = getProjectClient();
  const session = await composio.create(getComposioUserId(), {
    toolkits: [toolkit],
  });

  const auth = await session.authorize(
    toolkit,
    callbackUrl ? { callbackUrl } : undefined,
  );

  if (!auth.redirectUrl) {
    throw new Error(`Composio did not return a connect URL for ${toolkit}`);
  }

  return auth.redirectUrl;
}

export async function listAccountsViaProjectSdk(
  toolkit: SocialToolkit,
): Promise<Array<{ id: string; status: string }>> {
  const composio = getProjectClient();
  const response = await composio.connectedAccounts.list({
    userIds: [getComposioUserId()],
    toolkitSlugs: [toolkit],
    statuses: ["ACTIVE"],
  });

  return response.items.map((item) => ({
    id: item.id,
    status: item.status,
  }));
}
