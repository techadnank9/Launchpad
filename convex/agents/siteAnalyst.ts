"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { normalizeDomain } from "../lib/domain";
import { mergePersonas } from "../lib/memory";
import { scrapeWebsite } from "../lib/scraper";
import { analyzeSiteWithGPT } from "../lib/openai";

export const run = internalAction({
  args: { runId: v.id("runs"), url: v.string() },
  handler: async (ctx, args): Promise<Id<"personas">[]> => {
    await ctx.runMutation(internal.runs.updateRunStatus, {
      runId: args.runId,
      status: "analyzing",
    });

    try {
      const domain = normalizeDomain(args.url);
      const siteId = await ctx.runMutation(internal.sites.getOrCreate, {
        domain,
        url: args.url,
      });
      await ctx.runMutation(internal.sites.attachRun, {
        runId: args.runId,
        siteId,
      });

      const cachedRows = await ctx.runQuery(internal.sites.listPersonas, {
        siteId,
      });
      const cachedPersonas = cachedRows.map(
        ({
          name,
          painPoints,
          messagingAngle,
          contentTone,
          outboundTargets,
          posterStyle,
        }) => ({
          name,
          painPoints,
          messagingAngle,
          contentTone,
          outboundTargets,
          posterStyle,
        }),
      );

      const scraped = await scrapeWebsite(args.url);
      const analysis = await analyzeSiteWithGPT(
        args.url,
        scraped.text,
        scraped.meta,
      );

      const personas = mergePersonas(cachedPersonas, analysis.personas);

      await ctx.runMutation(internal.sites.updateSiteProfile, {
        siteId,
        productSummary: analysis.productSummary,
        valueProp: analysis.valueProp,
        brandCompanyName: analysis.brand.companyName,
        brandTagline: analysis.brand.tagline,
        brandColors: analysis.brand.primaryColors,
        brandVisualStyle: analysis.brand.visualStyle,
        brandImageryNotes: analysis.brand.imageryNotes,
      });

      await ctx.runMutation(internal.sites.replacePersonas, {
        siteId,
        personas,
      });

      await ctx.runMutation(internal.runs.updateRunStatus, {
        runId: args.runId,
        status: "personas_ready",
        productSummary: analysis.productSummary,
        valueProp: analysis.valueProp,
        brandCompanyName: analysis.brand.companyName,
        brandTagline: analysis.brand.tagline,
        brandColors: analysis.brand.primaryColors,
        brandVisualStyle: analysis.brand.visualStyle,
        brandImageryNotes: analysis.brand.imageryNotes,
      });

      const personaIds: Id<"personas">[] = await ctx.runMutation(
        internal.personas.createPersonas,
        {
          runId: args.runId,
          personas,
        },
      );

      await ctx.runMutation(internal.runs.updateRunStatus, {
        runId: args.runId,
        status: "processing",
      });

      for (const personaId of personaIds) {
        await ctx.scheduler.runAfter(0, internal.agents.leadAgent.run, {
          runId: args.runId,
          personaId,
          productSummary: analysis.productSummary,
        });
      }

      return personaIds;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed";
      await ctx.runMutation(internal.runs.updateRunStatus, {
        runId: args.runId,
        status: "failed",
        error: message,
      });
      throw error;
    }
  },
});
