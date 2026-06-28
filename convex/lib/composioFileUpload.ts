"use node";

import crypto from "crypto";
import { requireEnv } from "./env";
import type { PosterImage } from "./posterImage";

export type ComposioFileDescriptor = {
  name: string;
  mimetype: string;
  s3key: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

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

export async function uploadPosterToComposioApi(
  image: PosterImage,
): Promise<ComposioFileDescriptor> {
  const apiKey = requireEnv("COMPOSIO_API_KEY");
  const { ext, mimetype } = extensionForContentType(image.contentType);
  const filename = `poster.${ext}`;
  const bytes = Buffer.from(image.bytes);
  const md5 = crypto.createHash("md5").update(bytes).digest("hex");

  const requestResponse = await fetch(
    "https://backend.composio.dev/api/v3/files/upload/request",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        md5,
        filename,
        mimetype,
        tool_slug: "LINKEDIN_CREATE_LINKED_IN_POST",
        toolkit_slug: "linkedin",
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!requestResponse.ok) {
    const body = await requestResponse.text();
    throw new Error(
      `Composio file upload request failed: HTTP ${requestResponse.status}${body ? `: ${body}` : ""}`,
    );
  }

  const payload = asRecord(await requestResponse.json());
  const s3key = pickString(payload?.key, payload?.s3key);
  const uploadUrl = pickString(payload?.new_presigned_url, payload?.newPresignedUrl);
  if (!s3key || !uploadUrl) {
    throw new Error("Composio file upload request returned an invalid payload");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimetype },
    body: bytes,
    signal: AbortSignal.timeout(60_000),
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Composio file upload failed: HTTP ${uploadResponse.status}`,
    );
  }

  return { name: filename, mimetype, s3key };
}
