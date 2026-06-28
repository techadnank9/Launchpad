import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const insertPost = internalMutation({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    caption: v.string(),
    posterUrl: v.string(),
    platform: v.union(
      v.literal("linkedin"),
      v.literal("twitter"),
      v.literal("instagram"),
    ),
    scheduledAt: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("posted"),
    ),
    postizId: v.optional(v.string()),
    externalPostId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("posts", args);
  },
});

export const getPost = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.postId);
  },
});

export const updatePostContent = internalMutation({
  args: {
    postId: v.id("posts"),
    caption: v.string(),
    posterUrl: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("posted"),
    ),
    previousPosterUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { postId, ...patch } = args;
    await ctx.db.patch(postId, patch);
  },
});

export const stagePosterRevision = internalMutation({
  args: {
    postId: v.id("posts"),
    newPosterUrl: v.string(),
    previousPosterUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      posterUrl: args.newPosterUrl,
      previousPosterUrl: args.previousPosterUrl,
      status: "draft",
    });
  },
});

export const saveCaption = mutation({
  args: {
    postId: v.id("posts"),
    caption: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status === "posted") throw new Error("Cannot edit a published post");

    const caption = args.caption.trim();
    if (!caption) throw new Error("Caption cannot be empty");

    await ctx.db.patch(args.postId, { caption, status: "draft" });

    const persona = await ctx.db.get(post.personaId);
    if (persona) {
      await ctx.db.patch(post.personaId, { caption });
    }

    return { success: true };
  },
});

export const requestCaptionAiRevision = mutation({
  args: {
    postId: v.id("posts"),
    instructions: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status === "posted") throw new Error("This post is already published");

    const instructions = args.instructions.trim();
    if (!instructions) throw new Error("Describe how to refine the caption");

    await ctx.scheduler.runAfter(0, internal.postActions.reviseCaptionWithAi, {
      postId: args.postId,
      instructions,
    });

    return { success: true };
  },
});

export const requestPosterAiRevision = mutation({
  args: {
    postId: v.id("posts"),
    instructions: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status === "posted") throw new Error("This post is already published");

    const instructions = args.instructions.trim();
    if (!instructions) throw new Error("Describe what to change in the poster");

    await ctx.scheduler.runAfter(0, internal.postActions.revisePosterWithAi, {
      postId: args.postId,
      instructions,
    });

    return { success: true };
  },
});

export const confirmPosterRevision = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (!post.previousPosterUrl) {
      return { success: true, message: "No pending poster revision" };
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_persona", (q) => q.eq("personaId", post.personaId))
      .collect();

    for (const p of posts) {
      if (p.status === "posted") continue;
      await ctx.db.patch(p._id, {
        posterUrl: post.posterUrl,
        previousPosterUrl: undefined,
        status: "draft",
      });
    }

    const persona = await ctx.db.get(post.personaId);
    if (persona) {
      await ctx.db.patch(post.personaId, { posterUrl: post.posterUrl });
    }

    return { success: true };
  },
});

export const revertPosterRevision = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (!post.previousPosterUrl) {
      throw new Error("No previous poster to restore");
    }

    await ctx.db.patch(args.postId, {
      posterUrl: post.previousPosterUrl,
      previousPosterUrl: undefined,
      status: "draft",
    });

    const persona = await ctx.db.get(post.personaId);
    if (persona?.posterUrl === post.posterUrl) {
      await ctx.db.patch(post.personaId, {
        posterUrl: post.previousPosterUrl,
      });
    }

    return { success: true };
  },
});

export const syncPersonaPoster = internalMutation({
  args: {
    personaId: v.id("personas"),
    posterUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_persona", (q) => q.eq("personaId", args.personaId))
      .collect();

    for (const post of posts) {
      if (post.status === "posted") continue;
      await ctx.db.patch(post._id, { posterUrl: args.posterUrl, status: "draft" });
    }

    const persona = await ctx.db.get(args.personaId);
    if (persona) {
      await ctx.db.patch(args.personaId, { posterUrl: args.posterUrl });
    }
  },
});

export const requestPostModification = mutation({
  args: {
    postId: v.id("posts"),
    instructions: v.string(),
    reviseCaption: v.boolean(),
    revisePoster: v.boolean(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status === "posted") {
      throw new Error("This post is already published");
    }
    const instructions = args.instructions.trim();
    if (!instructions) throw new Error("Describe what you want changed");
    if (!args.reviseCaption && !args.revisePoster) {
      throw new Error("Choose caption, poster, or both to revise");
    }

    if (args.reviseCaption) {
      await ctx.scheduler.runAfter(0, internal.postActions.reviseCaptionWithAi, {
        postId: args.postId,
        instructions,
      });
    }
    if (args.revisePoster) {
      await ctx.scheduler.runAfter(0, internal.postActions.revisePosterWithAi, {
        postId: args.postId,
        instructions,
      });
    }

    return { success: true };
  },
});

export const markScheduled = internalMutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, { status: "scheduled" });
  },
});

export const markPosted = internalMutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, { status: "posted" });
  },
});

export const markPublished = internalMutation({
  args: {
    postId: v.id("posts"),
    externalPostId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      status: "posted",
      ...(args.externalPostId ? { externalPostId: args.externalPostId } : {}),
    });
  },
});

export const listByRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

export const listByPersona = query({
  args: { personaId: v.id("personas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_persona", (q) => q.eq("personaId", args.personaId))
      .collect();
  },
});

export const approveAndPost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status === "posted") {
      return { success: true, message: "Already published" };
    }

    await ctx.scheduler.runAfter(0, internal.composioActions.publishPost, {
      postId: args.postId,
    });

    if (post.platform === "linkedin") {
      return {
        success: true,
        message: "Posting to LinkedIn…",
        channel: "composio" as const,
      };
    }

    if (post.postizId) {
      return {
        success: true,
        message: "Sending to Postiz…",
        channel: "postiz" as const,
      };
    }

    return {
      success: true,
      message: "Posting…",
      channel: "local" as const,
    };
  },
});

export const approvePersonaCampaign = mutation({
  args: { personaId: v.id("personas") },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_persona", (q) => q.eq("personaId", args.personaId))
      .collect();

    if (posts.length === 0) {
      throw new Error("No posts found for this persona");
    }

    let queued = 0;
    for (const post of posts) {
      if (post.status === "posted") {
        queued += 1;
        continue;
      }

      await ctx.scheduler.runAfter(0, internal.composioActions.publishPost, {
        postId: post._id,
      });
      queued += 1;
    }

    return {
      success: true,
      message: `Posting ${queued} platform${queued === 1 ? "" : "s"}…`,
    };
  },
});
