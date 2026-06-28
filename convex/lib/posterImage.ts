"use node";

import { Id } from "../_generated/dataModel";

export type PosterImage = {
  bytes: Uint8Array;
  contentType: string;
};

export function storageIdFromPosterUrl(url: string): Id<"_storage"> | null {
  const match = url.match(/\/api\/storage\/([^/?]+)/);
  return match?.[1] ? (match[1] as Id<"_storage">) : null;
}

type StorageReader = {
  storage: {
    get: (id: Id<"_storage">) => Promise<Blob | null>;
    getUrl: (id: Id<"_storage">) => Promise<string | null>;
  };
};

export async function loadPosterImage(
  ctx: StorageReader,
  posterUrl: string,
): Promise<PosterImage> {
  const storageId = storageIdFromPosterUrl(posterUrl);
  if (storageId) {
    const blob = await ctx.storage.get(storageId);
    if (blob) {
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        contentType: blob.type || "image/png",
      };
    }
  }

  const resolvedUrl =
    storageId ? ((await ctx.storage.getUrl(storageId)) ?? posterUrl) : posterUrl;
  return fetchPosterFromUrl(resolvedUrl);
}

export async function fetchPosterFromUrl(posterUrl: string): Promise<PosterImage> {
  const response = await fetch(posterUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Could not fetch poster image: HTTP ${response.status}`);
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/png";
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error("Poster image was empty");
  }

  return { bytes, contentType };
}
