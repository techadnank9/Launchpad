"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { promotePostToSchedule } from "./lib/postiz";

export const publishToPostiz = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(internal.posts.getPost, {
      postId: args.postId,
    });
    if (!post?.postizId) {
      throw new Error("Post has no Postiz ID");
    }

    await promotePostToSchedule(post.postizId);
    await ctx.runMutation(internal.posts.markScheduled, { postId: args.postId });
  },
});
