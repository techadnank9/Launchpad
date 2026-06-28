"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { brandFromRun } from "./lib/brandContext";
import { reviseCaption, revisePosterBytes } from "./lib/openai";

function toPersonaResult(persona: {
  name: string;
  painPoints: string[];
  messagingAngle: string;
  contentTone: string;
  outboundTargets: string;
  posterStyle: string;
  dealSizeMinUsd?: number;
  dealSizeMaxUsd?: number;
  pricingModel?: string;
}) {
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

export const reviseCaptionWithAi = internalAction({
  args: {
    postId: v.id("posts"),
    instructions: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(internal.posts.getPost, {
      postId: args.postId,
    });
    if (!post) throw new Error("Post not found");
    if (post.status === "posted") throw new Error("Cannot modify a published post");

    const [persona, run] = await Promise.all([
      ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: post.personaId,
      }),
      ctx.runQuery(internal.agents.helpers.getRun, { runId: post.runId }),
    ]);
    if (!persona || !run) throw new Error("Persona or run not found");

    const brand = brandFromRun(run, run.productSummary ?? "");
    const caption = await reviseCaption({
      currentCaption: post.caption,
      instructions: args.instructions,
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
  },
});

export const revisePosterWithAi = internalAction({
  args: {
    postId: v.id("posts"),
    instructions: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(internal.posts.getPost, {
      postId: args.postId,
    });
    if (!post) throw new Error("Post not found");
    if (post.status === "posted") throw new Error("Cannot modify a published post");

    const [persona, run] = await Promise.all([
      ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: post.personaId,
      }),
      ctx.runQuery(internal.agents.helpers.getRun, { runId: post.runId }),
    ]);
    if (!persona || !run) throw new Error("Persona or run not found");

    const brand = brandFromRun(run, run.productSummary ?? "");
    const posterBytes = await revisePosterBytes({
      instructions: args.instructions,
      brand,
      persona: toPersonaResult(persona),
      currentPosterUrl: post.previousPosterUrl ?? post.posterUrl,
    });
    const storageId = await ctx.storage.store(
      new Blob([Buffer.from(posterBytes)], { type: "image/png" }),
    );
    const newPosterUrl = await ctx.storage.getUrl(storageId);
    if (!newPosterUrl) throw new Error("Failed to store revised poster");

    await ctx.runMutation(internal.posts.stagePosterRevision, {
      postId: args.postId,
      newPosterUrl,
      previousPosterUrl: post.previousPosterUrl ?? post.posterUrl,
    });
  },
});

export const modifyPost = internalAction({
  args: {
    postId: v.id("posts"),
    instructions: v.string(),
    reviseCaption: v.boolean(),
    revisePoster: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.reviseCaption) {
      await ctx.scheduler.runAfter(0, internal.postActions.reviseCaptionWithAi, {
        postId: args.postId,
        instructions: args.instructions,
      });
    }
    if (args.revisePoster) {
      await ctx.scheduler.runAfter(0, internal.postActions.revisePosterWithAi, {
        postId: args.postId,
        instructions: args.instructions,
      });
    }
  },
});
