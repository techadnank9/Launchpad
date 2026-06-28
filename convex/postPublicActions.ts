"use node";

import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { brandFromRun } from "./lib/brandContext";
import { editPosterBytes, reviseCaption } from "./lib/openai";

function toPersonaResult(persona: Doc<"personas">) {
  return {
    name: persona.name,
    painPoints: persona.painPoints,
    messagingAngle: persona.messagingAngle,
    contentTone: persona.contentTone,
    outboundTargets: persona.outboundTargets,
    posterStyle: persona.posterStyle,
    dealSizeMinUsd: persona.dealSizeMinUsd,
    dealSizeMaxUsd: persona.dealSizeMaxUsd,
    pricingModel: persona.pricingModel,
  };
}

function storageIdFromPosterUrl(url: string): Id<"_storage"> | null {
  const match = url.match(/\/api\/storage\/([^/?]+)/);
  return match?.[1] ? (match[1] as Id<"_storage">) : null;
}

async function loadPosterBytes(
  ctx: ActionCtx,
  posterUrl: string,
): Promise<Buffer> {
  const storageId = storageIdFromPosterUrl(posterUrl);
  if (storageId) {
    const blob = await ctx.storage.get(storageId);
    if (blob) {
      return Buffer.from(await blob.arrayBuffer());
    }
  }

  const response = await fetch(posterUrl);
  if (!response.ok) {
    throw new Error("Could not load the current poster image");
  }
  return Buffer.from(await response.arrayBuffer());
}

export const applyCaptionFeedback = action({
  args: {
    postId: v.id("posts"),
    currentCaption: v.string(),
    instructions: v.string(),
  },
  handler: async (ctx, args): Promise<{ caption: string }> => {
    const post = await ctx.runQuery(internal.posts.getPost, {
      postId: args.postId,
    });
    if (!post) throw new Error("Post not found");
    if (post.status === "posted") throw new Error("Cannot modify a published post");

    const instructions = args.instructions.trim();
    const currentCaption = args.currentCaption.trim();
    if (!instructions) throw new Error("Describe how to refine the caption");
    if (!currentCaption) throw new Error("Caption cannot be empty");

    const [persona, run] = await Promise.all([
      ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: post.personaId,
      }),
      ctx.runQuery(internal.agents.helpers.getRun, { runId: post.runId }),
    ]);
    if (!persona || !run) throw new Error("Persona or run not found");

    const brand = brandFromRun(run, run.productSummary ?? "");
    const caption = await reviseCaption({
      currentCaption,
      instructions,
      brand,
      persona: toPersonaResult(persona),
      platform: post.platform,
    });

    await ctx.runMutation(internal.posts.updatePostContent, {
      postId: args.postId,
      caption,
      posterUrl: post.posterUrl,
      status: "draft",
    });

    await ctx.runMutation(internal.personas.updatePersonaStatus, {
      personaId: post.personaId,
      status: persona.status,
      caption,
    });

    return { caption };
  },
});

export const applyPosterFeedback = action({
  args: {
    postId: v.id("posts"),
    instructions: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ posterUrl: string; previousPosterUrl: string }> => {
    const post = await ctx.runQuery(internal.posts.getPost, {
      postId: args.postId,
    });
    if (!post) throw new Error("Post not found");
    if (post.status === "posted") throw new Error("Cannot modify a published post");

    const instructions = args.instructions.trim();
    if (!instructions) throw new Error("Describe what to change in the poster");

    const [persona, run] = await Promise.all([
      ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: post.personaId,
      }),
      ctx.runQuery(internal.agents.helpers.getRun, { runId: post.runId }),
    ]);
    if (!persona || !run) throw new Error("Persona or run not found");

    const brand = brandFromRun(run, run.productSummary ?? "");
    const sourcePosterUrl: string = post.posterUrl;
    const imageBytes = await loadPosterBytes(ctx, sourcePosterUrl);

    const posterBytes = await editPosterBytes({
      instructions,
      imageBytes,
      brand,
      persona: toPersonaResult(persona),
    });

    const storageId = await ctx.storage.store(
      new Blob([Buffer.from(posterBytes)], { type: "image/png" }),
    );
    const newPosterUrl = await ctx.storage.getUrl(storageId);
    if (!newPosterUrl) throw new Error("Failed to store revised poster");

    const previousPosterUrl: string =
      post.previousPosterUrl ?? sourcePosterUrl;

    await ctx.runMutation(internal.posts.stagePosterRevision, {
      postId: args.postId,
      newPosterUrl,
      previousPosterUrl,
    });

    return { posterUrl: newPosterUrl, previousPosterUrl };
  },
});
