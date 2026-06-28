"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { brandFromRun } from "../lib/brandContext";
import { generateEmailSequence } from "../lib/openai";

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

    try {
      const brand = brandFromRun(run, args.productSummary);
      const email = await generateEmailSequence(brand, persona);

      await ctx.runMutation(internal.emails.upsertSequence, {
        runId: args.runId,
        personaId: args.personaId,
        subject: email.subject,
        touches: email.touches,
      });

      await ctx.scheduler.runAfter(0, internal.agents.posterAgent.run, {
        runId: args.runId,
        personaId: args.personaId,
        productSummary: args.productSummary,
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
