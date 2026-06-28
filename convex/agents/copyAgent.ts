"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateEmailSequence } from "../lib/openai";

export const run = internalAction({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    productSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const persona = await ctx.runQuery(internal.agents.helpers.getPersona, {
      personaId: args.personaId,
    });
    if (!persona) return;

    try {
      const email = await generateEmailSequence(args.productSummary, persona);

      await ctx.runMutation(internal.emails.insertEmail, {
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
