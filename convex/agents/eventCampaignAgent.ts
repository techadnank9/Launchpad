"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { brandFromRun } from "../lib/brandContext";
import {
  generateCaption,
  generatePosterBytes,
} from "../lib/openai";
import {
  eventPostScheduledAt,
  eventsForNextMonth,
} from "../lib/marketingEvents";
import { isPostizConfigured } from "../lib/env";
import { schedulePersonaPosts } from "../lib/postiz";

const LOCAL_PLATFORMS = ["linkedin", "twitter", "instagram"] as const;

export const run = internalAction({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    productSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const [persona, run, existingKeys] = await Promise.all([
      ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: args.personaId,
      }),
      ctx.runQuery(internal.agents.helpers.getRun, { runId: args.runId }),
      ctx.runQuery(internal.posts.getCampaignKeysByPersona, {
        personaId: args.personaId,
      }),
    ]);
    if (!persona || !run) return;

    let brand;
    try {
      brand = brandFromRun(run, args.productSummary);
    } catch (error) {
      console.error("Event campaigns skipped — brand kit missing:", error);
      return;
    }

    const events = eventsForNextMonth(new Date()).filter(
      (event) => !existingKeys.includes(event.key),
    );
    if (events.length === 0) return;

    for (const event of events) {
      try {
        const [caption, posterBytes] = await Promise.all([
          generateCaption(brand, persona, event),
          generatePosterBytes(brand, persona, event),
        ]);

        const storageId = await ctx.storage.store(
          new Blob([Buffer.from(posterBytes)], { type: "image/png" }),
        );
        const posterUrl = await ctx.storage.getUrl(storageId);
        if (!posterUrl) {
          throw new Error(`Failed to store ${event.label} poster`);
        }

        if (!isPostizConfigured()) {
          for (const platform of LOCAL_PLATFORMS) {
            await ctx.runMutation(internal.posts.insertPost, {
              runId: args.runId,
              personaId: args.personaId,
              caption,
              posterUrl,
              platform,
              scheduledAt: eventPostScheduledAt(event, platform),
              status: "draft",
              campaignKey: event.key,
              eventLabel: event.label,
            });
          }
        } else {
          const results = await schedulePersonaPosts(caption, posterUrl);
          for (const result of results) {
            await ctx.runMutation(internal.posts.insertPost, {
              runId: args.runId,
              personaId: args.personaId,
              caption,
              posterUrl,
              platform: result.platform,
              scheduledAt: eventPostScheduledAt(event, result.platform),
              status: "draft",
              postizId: result.postizId,
              campaignKey: event.key,
              eventLabel: event.label,
            });
          }
        }
      } catch (error) {
        console.error(`Event campaign failed (${event.key}):`, error);
      }
    }
  },
});
