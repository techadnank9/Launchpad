"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { findLeads } from "../lib/fiber";
import { scoreLeads } from "../lib/orangeSlice";
import { mergeLeads, personaSlug, toLeadMemory, type LeadMemory } from "../lib/memory";
import { stageFromIntentScore } from "../lib/pipeline";

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

    const run = await ctx.runQuery(internal.agents.helpers.getRun, {
      runId: args.runId,
    });

    try {
      await ctx.runMutation(internal.personas.updatePersonaStatus, {
        personaId: args.personaId,
        status: "processing",
      });

      const slug = personaSlug(persona.name);
      let mergedLeads: LeadMemory[] = [];

      if (run?.siteId) {
        const cachedRows = await ctx.runQuery(
          internal.sites.listLeadsForPersona,
          { siteId: run.siteId, personaSlug: slug },
        );
        mergedLeads = cachedRows.map(
          ({
            name,
            title,
            company,
            email,
            linkedin,
            intentScore,
            intentSignals,
            pipelineStage,
          }): LeadMemory => ({
            name,
            title,
            company,
            email,
            linkedin,
            intentScore,
            intentSignals,
            pipelineStage,
          }),
        );
      }

      const freshLeads = await findLeads(persona);
      const scoredFresh = await scoreLeads(freshLeads, persona);
      const freshMemory = scoredFresh.map((lead) =>
        toLeadMemory({
          ...lead,
          pipelineStage: stageFromIntentScore(lead.intentScore),
        }),
      );

      mergedLeads =
        mergedLeads.length > 0
          ? mergeLeads(mergedLeads, freshMemory)
          : freshMemory;

      if (run?.siteId) {
        await ctx.runMutation(internal.sites.replaceLeadsForPersona, {
          siteId: run.siteId,
          personaSlug: slug,
          personaName: persona.name,
          leads: mergedLeads,
        });
      }

      await ctx.runMutation(internal.leads.insertLeads, {
        runId: args.runId,
        personaId: args.personaId,
        leads: mergedLeads,
      });

      const runPersonas = await ctx.runQuery(internal.agents.helpers.getRunPersonas, {
        runId: args.runId,
      });
      const personaIndex = runPersonas.findIndex((p) => p._id === args.personaId);

      await ctx.runMutation(internal.meetings.scheduleForPersona, {
        runId: args.runId,
        siteId: run?.siteId,
        personaId: args.personaId,
        personaIndex: personaIndex >= 0 ? personaIndex : 0,
      });

      await ctx.scheduler.runAfter(0, internal.agents.copyAgent.run, {
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
