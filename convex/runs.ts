import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { brandSocialStudyValidator } from "./schema";

export const submitUrl = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const normalizedUrl = args.url.trim();
    if (!normalizedUrl) {
      throw new Error("URL is required");
    }

    const runId = await ctx.db.insert("runs", {
      url: normalizedUrl.startsWith("http")
        ? normalizedUrl
        : `https://${normalizedUrl}`,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.workflow.startWorkflow, { runId });
    return runId;
  },
});

export const getRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});

export const getLatestRun = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("runs")
      .withIndex("by_created")
      .order("desc")
      .first();
  },
});

export const updateRunStatus = internalMutation({
  args: {
    runId: v.id("runs"),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("personas_ready"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    productSummary: v.optional(v.string()),
    valueProp: v.optional(v.string()),
    brandCompanyName: v.optional(v.string()),
    brandTagline: v.optional(v.string()),
    brandColors: v.optional(v.array(v.string())),
    brandVisualStyle: v.optional(v.string()),
    brandImageryNotes: v.optional(v.string()),
    brandSocialStudy: v.optional(brandSocialStudyValidator),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { runId, ...updates } = args;
    const patch: Record<string, unknown> = { status: updates.status };
    if (updates.productSummary !== undefined) {
      patch.productSummary = updates.productSummary;
    }
    if (updates.valueProp !== undefined) {
      patch.valueProp = updates.valueProp;
    }
    if (updates.brandCompanyName !== undefined) {
      patch.brandCompanyName = updates.brandCompanyName;
    }
    if (updates.brandTagline !== undefined) {
      patch.brandTagline = updates.brandTagline;
    }
    if (updates.brandColors !== undefined) {
      patch.brandColors = updates.brandColors;
    }
    if (updates.brandVisualStyle !== undefined) {
      patch.brandVisualStyle = updates.brandVisualStyle;
    }
    if (updates.brandImageryNotes !== undefined) {
      patch.brandImageryNotes = updates.brandImageryNotes;
    }
    if (updates.brandSocialStudy !== undefined) {
      patch.brandSocialStudy = updates.brandSocialStudy;
    }
    if (updates.error !== undefined) {
      patch.error = updates.error;
    }
    await ctx.db.patch(runId, patch);
  },
});
