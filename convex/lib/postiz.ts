"use node";

import { assertOk, optionalEnv, requireEnv } from "./env";

export type LaunchpadPlatform = "linkedin" | "twitter" | "instagram";

export type ScheduleResult = {
  postizId: string;
  scheduledAt: number;
  platform: LaunchpadPlatform;
  integrationId: string;
};

type PostizIntegration = {
  id: string;
  name: string;
  identifier: string;
  disabled: boolean;
};

type PostizMediaFile = {
  id: string;
  path: string;
};

type CreatePostResponse = Array<{
  postId: string;
  integration: string;
}>;

const PLATFORM_ORDER: LaunchpadPlatform[] = ["linkedin", "twitter", "instagram"];

const PLATFORM_IDENTIFIERS: Record<LaunchpadPlatform, string[]> = {
  linkedin: ["linkedin", "linkedin-page"],
  twitter: ["x"],
  instagram: ["instagram", "instagram-standalone"],
};

const ENV_INTEGRATION_KEYS: Record<LaunchpadPlatform, string> = {
  linkedin: "POSTIZ_LINKEDIN_INTEGRATION_ID",
  twitter: "POSTIZ_X_INTEGRATION_ID",
  instagram: "POSTIZ_INSTAGRAM_INTEGRATION_ID",
};

function getBaseUrl(): string {
  let base = requireEnv("POSTIZ_BASE_URL").replace(/\/$/, "");
  if (!base.endsWith("/public/v1")) {
    base = `${base.replace(/\/api$/, "")}/public/v1`;
  }
  return base;
}

function getApiKey(): string {
  return requireEnv("POSTIZ_API_KEY");
}

async function postizFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = getBaseUrl();
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(url, {
    ...init,
    headers: {
      Authorization: getApiKey(),
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(30000),
  });
}

export async function checkConnection(): Promise<boolean> {
  const response = await postizFetch("/is-connected");
  return response.ok;
}

export async function listIntegrations(): Promise<PostizIntegration[]> {
  const response = await postizFetch("/integrations");
  await assertOk(response, "Postiz");
  const data = (await response.json()) as PostizIntegration[];
  return data.filter((i) => !i.disabled);
}

function platformForIntegration(
  integration: PostizIntegration,
): LaunchpadPlatform | null {
  for (const [platform, identifiers] of Object.entries(PLATFORM_IDENTIFIERS)) {
    if (identifiers.includes(integration.identifier)) {
      return platform as LaunchpadPlatform;
    }
  }
  return null;
}

async function resolveIntegration(
  platform: LaunchpadPlatform,
  integrations: PostizIntegration[],
): Promise<PostizIntegration> {
  const overrideId = optionalEnv(ENV_INTEGRATION_KEYS[platform]);
  if (overrideId) {
    const match = integrations.find((i) => i.id === overrideId);
    if (!match) {
      throw new Error(
        `Postiz integration ${overrideId} (${platform}) not found. Check ${ENV_INTEGRATION_KEYS[platform]} in .env.local`,
      );
    }
    return match;
  }

  const identifiers = PLATFORM_IDENTIFIERS[platform];
  const match = integrations.find((i) => identifiers.includes(i.identifier));
  if (!match) {
    throw new Error(
      `No connected Postiz channel for ${platform}. Connect ${identifiers.join(" or ")} in your Postiz dashboard.`,
    );
  }
  return match;
}

async function uploadPosterFromUrl(posterUrl: string): Promise<PostizMediaFile> {
  const response = await postizFetch("/upload-from-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: posterUrl }),
  });

  await assertOk(response, "Postiz upload-from-url");

  const data = (await response.json()) as PostizMediaFile;
  if (!data.id || !data.path) {
    throw new Error("Postiz upload returned no media file");
  }
  return data;
}

function buildSettings(integration: PostizIntegration) {
  switch (integration.identifier) {
    case "linkedin":
      return { __type: "linkedin", post_as_images_carousel: false };
    case "linkedin-page":
      return { __type: "linkedin-page", post_as_images_carousel: false };
    case "x":
      return { __type: "x", who_can_reply_post: "everyone", community: "" };
    case "instagram":
      return {
        __type: "instagram",
        post_type: "post",
        is_trial_reel: false,
        collaborators: [],
      };
    case "instagram-standalone":
      return {
        __type: "instagram-standalone",
        post_type: "post",
        is_trial_reel: false,
        collaborators: [],
      };
    default:
      return { __type: integration.identifier };
  }
}

export async function schedulePersonaPosts(
  caption: string,
  posterUrl: string,
): Promise<ScheduleResult[]> {
  const integrations = await listIntegrations();
  const scheduledAt = Date.now() + 24 * 60 * 60 * 1000;
  const scheduleDate = new Date(scheduledAt).toISOString();

  let media: PostizMediaFile;
  try {
    media = await uploadPosterFromUrl(posterUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    throw new Error(
      `Could not upload poster to Postiz: ${message}. Ensure Postiz can reach the image URL (public HTTPS).`,
    );
  }

  const imageRef = [{ id: media.id, path: media.path }];
  const postEntries: Array<{
    platform: LaunchpadPlatform;
    integrationId: string;
    entry: {
      integration: { id: string };
      value: Array<{ content: string; image: typeof imageRef }>;
      settings: Record<string, unknown>;
    };
  }> = [];

  for (const platform of PLATFORM_ORDER) {
    const integration = await resolveIntegration(platform, integrations);
    postEntries.push({
      platform,
      integrationId: integration.id,
      entry: {
        integration: { id: integration.id },
        value: [{ content: caption, image: imageRef }],
        settings: buildSettings(integration),
      },
    });
  }

  const response = await postizFetch("/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "draft",
      date: scheduleDate,
      shortLink: false,
      tags: [],
      posts: postEntries.map((p) => p.entry),
    }),
  });

  await assertOk(response, "Postiz create post");

  const created = (await response.json()) as CreatePostResponse;
  if (!created.length) {
    throw new Error("Postiz returned no created posts");
  }

  const integrationToPlatform = new Map(
    postEntries.map((p) => [p.integrationId, p.platform]),
  );

  return created.map((item) => ({
    postizId: item.postId,
    scheduledAt,
    platform:
      integrationToPlatform.get(item.integration) ??
      platformForIntegration(
        integrations.find((i) => i.id === item.integration) ?? {
          id: item.integration,
          identifier: "",
          name: "",
          disabled: false,
        },
      ) ??
      "linkedin",
    integrationId: item.integration,
  }));
}

export async function promotePostToSchedule(postizId: string): Promise<void> {
  const response = await postizFetch(`/posts/${postizId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "schedule" }),
  });
  await assertOk(response, "Postiz change status");
}

/** @deprecated Use schedulePersonaPosts */
export async function schedulePost(
  caption: string,
  posterUrl: string,
  platform: LaunchpadPlatform = "linkedin",
): Promise<ScheduleResult> {
  const results = await schedulePersonaPosts(caption, posterUrl);
  const match = results.find((r) => r.platform === platform);
  if (!match) {
    throw new Error(`Postiz did not create a post for ${platform}`);
  }
  return match;
}
