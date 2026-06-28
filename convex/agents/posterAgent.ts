"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import {
  generateCaption,
  generatePosterBytes,
  type BrandContext,
} from "../lib/openai";

function brandFromRun(
  run: {
    url: string;
    productSummary?: string;
    valueProp?: string;
    brandCompanyName?: string;
    brandTagline?: string;
    brandColors?: string[];
    brandVisualStyle?: string;
    brandImageryNotes?: string;
  },
  productSummary: string,
): BrandContext {
  if (
    !run.brandCompanyName ||
    !run.brandTagline ||
    !run.brandColors?.length ||
    !run.brandVisualStyle ||
    !run.brandImageryNotes
  ) {
    throw new Error(
      "Brand kit missing on run — re-run site analysis with a fresh URL",
    );
  }

  return {
    siteUrl: run.url,
    productSummary: run.productSummary ?? productSummary,
    valueProp: run.valueProp ?? "",
    companyName: run.brandCompanyName,
    tagline: run.brandTagline,
    primaryColors: run.brandColors,
    visualStyle: run.brandVisualStyle,
    imageryNotes: run.brandImageryNotes,
  };
}

export const run = internalAction({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    productSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const [persona, run] = await Promise.all([
      ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: args.personaId,
      }),
      ctx.runQuery(internal.agents.helpers.getRun, { runId: args.runId }),
    ]);
    if (!persona || !run) return;

    const brand = brandFromRun(run, args.productSummary);

    try {
      const [caption, posterBytes] = await Promise.all([
        generateCaption(brand, persona),
        generatePosterBytes(brand, persona),
      ]);

      const storageId = await ctx.storage.store(
        new Blob([Buffer.from(posterBytes)], { type: "image/png" }),
      );
      const posterUrl = await ctx.storage.getUrl(storageId);
      if (!posterUrl) {
        throw new Error("Failed to store generated poster in Convex storage");
      }

      await ctx.runMutation(internal.personas.updatePersonaStatus, {
        personaId: args.personaId,
        status: "processing",
        caption,
        posterUrl,
      });

      await ctx.scheduler.runAfter(0, internal.agents.schedulerAgent.run, {
        runId: args.runId,
        personaId: args.personaId,
        caption,
        posterUrl,
      });
    } catch (error) {
      await ctx.runMutation(internal.personas.updatePersonaStatus, {
        personaId: args.personaId,
        status: "failed",
      });
      await ctx.scheduler.runAfter(0, internal.workflow.checkRunComplete, {
        runId: args.runId,
      });
      throw error;
    }
  },
});
