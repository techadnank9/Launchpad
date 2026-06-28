"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { schedulePersonaPosts } from "../lib/postiz";
import { isPostizConfigured } from "../lib/env";

const LOCAL_PLATFORMS = ["linkedin", "twitter", "instagram"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const PLATFORM_OFFSET_HOURS = { linkedin: 14, twitter: 17, instagram: 20 };

function postScheduledAt(personaIndex: number, platform: keyof typeof PLATFORM_OFFSET_HOURS) {
  const daysOut = 1 + personaIndex;
  const d = new Date(Date.now() + daysOut * DAY_MS);
  d.setUTCHours(PLATFORM_OFFSET_HOURS[platform], 0, 0, 0);
  return d.getTime();
}

export const run = internalAction({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    caption: v.string(),
    posterUrl: v.string(),
    campaignKey: v.optional(v.string()),
    eventLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const runPersonas = await ctx.runQuery(internal.agents.helpers.getRunPersonas, {
        runId: args.runId,
      });
      const personaIndex = runPersonas.findIndex((p) => p._id === args.personaId);

      if (!isPostizConfigured()) {
        for (const platform of LOCAL_PLATFORMS) {
          await ctx.runMutation(internal.posts.insertPost, {
            runId: args.runId,
            personaId: args.personaId,
            caption: args.caption,
            posterUrl: args.posterUrl,
            platform,
            scheduledAt: postScheduledAt(
              personaIndex >= 0 ? personaIndex : 0,
              platform,
            ),
            status: "draft",
            campaignKey: args.campaignKey ?? "evergreen",
            eventLabel: args.eventLabel,
          });
        }
      } else {
        const results = await schedulePersonaPosts(args.caption, args.posterUrl);
        const index = personaIndex >= 0 ? personaIndex : 0;

        for (const result of results) {
          await ctx.runMutation(internal.posts.insertPost, {
            runId: args.runId,
            personaId: args.personaId,
            caption: args.caption,
            posterUrl: args.posterUrl,
            platform: result.platform,
            scheduledAt: postScheduledAt(index, result.platform),
            status: "draft",
            postizId: result.postizId,
            campaignKey: args.campaignKey ?? "evergreen",
            eventLabel: args.eventLabel,
          });
        }
      }

      await ctx.runMutation(internal.personas.updatePersonaStatus, {
        personaId: args.personaId,
        status: "complete",
      });
    } catch (error) {
      await ctx.runMutation(internal.personas.updatePersonaStatus, {
        personaId: args.personaId,
        status: "failed",
      });
      throw error;
    } finally {
      await ctx.scheduler.runAfter(0, internal.workflow.checkRunComplete, {
        runId: args.runId,
      });
    }
  },
});
