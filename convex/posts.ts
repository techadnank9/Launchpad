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
    if (post.status === "posted" || post.status === "scheduled") {
      return { success: true, message: "Already scheduled" };
    }

    if (!post.postizId) {
      await ctx.db.patch(args.postId, { status: "scheduled" });
      return {
        success: true,
        message: "Marked scheduled in Launchpad (Postiz not connected)",
      };
    }

    await ctx.scheduler.runAfter(0, internal.postizActions.publishToPostiz, {
      postId: args.postId,
    });

    return { success: true, message: "Sending to Postiz…" };
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

    let scheduled = 0;
    for (const post of posts) {
      if (post.status === "posted" || post.status === "scheduled") {
        scheduled += 1;
        continue;
      }
      if (!post.postizId) {
        await ctx.db.patch(post._id, { status: "scheduled" });
        scheduled += 1;
        continue;
      }
      await ctx.scheduler.runAfter(0, internal.postizActions.publishToPostiz, {
        postId: post._id,
      });
      scheduled += 1;
    }

    return {
      success: true,
      message: `Scheduled ${scheduled} platform${scheduled === 1 ? "" : "s"}`,
    };
  },
});
