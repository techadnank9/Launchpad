"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { revealWorkEmail } from "./lib/fiber";

type LeadEmailTarget = {
  leadId: Id<"leads">;
  linkedin: string;
};

const BATCH_SIZE = 4;

export const enrichContactEmailsForRun = internalAction({
  args: {
    runId: v.id("runs"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ updated: number; attempted: number; remaining: number }> => {
    const leads = (await ctx.runQuery(internal.leads.listMissingEmailByRun, {
      runId: args.runId,
    })) as LeadEmailTarget[];

    const batch = leads.slice(0, BATCH_SIZE);
    let updated = 0;

    for (const lead of batch) {
      const email = await revealWorkEmail(lead.linkedin);
      if (!email) continue;

      await ctx.runMutation(internal.leads.updateLeadContact, {
        leadId: lead.leadId,
        email,
      });
      updated += 1;
    }

    const remaining = leads.length - batch.length;
    if (remaining > 0) {
      await ctx.scheduler.runAfter(0, internal.leadActions.enrichContactEmailsForRun, {
        runId: args.runId,
      });
    }

    return { updated, attempted: batch.length, remaining };
  },
});
