"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  extractBrandColorsFromHtml,
  mergeBrandColors,
} from "./lib/brandColors";
import { brandFromRun } from "./lib/brandContext";
import { MARKETING_EVENTS } from "./lib/marketingEvents";
import { generatePosterBytes } from "./lib/openai";
import { scrapeWebsite } from "./lib/scraper";

export const refreshFromSite = internalAction({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.runQuery(internal.agents.helpers.getRun, {
      runId: args.runId,
    });
    if (!run) throw new Error("Run not found");

    const scraped = await scrapeWebsite(run.url);
    const extracted = extractBrandColorsFromHtml(scraped.html, scraped.meta);
    const brandColors = mergeBrandColors(extracted, []);

    await ctx.runMutation(internal.runs.updateBrandColors, {
      runId: args.runId,
      brandColors,
      brandLogoUrl: scraped.meta.logoUrl,
    });

    return { brandColors, extractedFromSite: extracted, logoUrl: scraped.meta.logoUrl };
  },
});

export const regenerateRunPosters = internalAction({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.runQuery(internal.agents.helpers.getRun, {
      runId: args.runId,
    });
    if (!run?.brandCompanyName) {
      throw new Error("Brand kit missing — re-run site analysis first");
    }

    const posts = (await ctx.runQuery(internal.posts.listByRunInternal, {
      runId: args.runId,
    })) as Doc<"posts">[];

    const brand = brandFromRun(run, run.productSummary ?? "");

    const posterJobs = new Map<
      string,
      { personaId: Doc<"posts">["personaId"]; campaignKey?: string }
    >();
    for (const post of posts) {
      if (!post.posterUrl || posterJobs.has(post.posterUrl)) continue;
      posterJobs.set(post.posterUrl, {
        personaId: post.personaId,
        campaignKey: post.campaignKey,
      });
    }

    let updated = 0;
    for (const [oldUrl, job] of posterJobs) {
      const persona = await ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: job.personaId,
      });
      if (!persona) continue;

      const campaign =
        job.campaignKey && job.campaignKey !== "evergreen"
          ? MARKETING_EVENTS.find((event) => event.key === job.campaignKey)
          : undefined;

      try {
        const posterBytes = await generatePosterBytes(brand, persona, campaign);
        const storageId = await ctx.storage.store(
          new Blob([Buffer.from(posterBytes)], { type: "image/png" }),
        );
        const newUrl = await ctx.storage.getUrl(storageId);
        if (!newUrl) continue;

        await ctx.runMutation(internal.posts.replacePosterUrl, {
          runId: args.runId,
          fromUrl: oldUrl,
          toUrl: newUrl,
        });
        updated += 1;
      } catch (error) {
        console.error(`Poster regeneration failed (${oldUrl}):`, error);
      }
    }

    return { updated };
  },
});
