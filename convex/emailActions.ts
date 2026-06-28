"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { brandFromRun } from "./lib/brandContext";
import { generateEmailSequence } from "./lib/openai";

function toPersonaResult(persona: {
  name: string;
  painPoints: string[];
  messagingAngle: string;
  contentTone: string;
  outboundTargets: string;
  posterStyle: string;
  dealSizeMinUsd?: number;
  dealSizeMaxUsd?: number;
  pricingModel?: string;
}) {
  return {
    name: persona.name,
    painPoints: persona.painPoints,
    messagingAngle: persona.messagingAngle,
    contentTone: persona.contentTone,
    outboundTargets: persona.outboundTargets,
    posterStyle: persona.posterStyle,
    dealSizeMinUsd: persona.dealSizeMinUsd,
    dealSizeMaxUsd: persona.dealSizeMaxUsd,
    pricingModel: persona.pricingModel,
  };
}

export const regenerateForPersona = internalAction({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
  },
  handler: async (ctx, args) => {
    const [persona, run] = await Promise.all([
      ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: args.personaId,
      }),
      ctx.runQuery(internal.agents.helpers.getRun, { runId: args.runId }),
    ]);
    if (!persona || !run) return;

    const brand = brandFromRun(run, run.productSummary ?? run.valueProp ?? "");
    const sequence = await generateEmailSequence(brand, toPersonaResult(persona));

    await ctx.runMutation(internal.emails.upsertSequence, {
      runId: args.runId,
      personaId: args.personaId,
      subject: sequence.subject,
      touches: sequence.touches,
    });
  },
});

export const regenerateForRun = internalAction({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const personas = await ctx.runQuery(internal.agents.helpers.getRunPersonas, {
      runId: args.runId,
    });

    for (const persona of personas) {
      await ctx.scheduler.runAfter(0, internal.emailActions.regenerateForPersona, {
        runId: args.runId,
        personaId: persona._id,
      });
    }
  },
});
