import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const insertEmail = internalMutation({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    subject: v.string(),
    touches: v.array(v.object({ step: v.number(), body: v.string() })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("emails", {
      runId: args.runId,
      personaId: args.personaId,
      subject: args.subject,
      touches: args.touches,
      approved: false,
      sent: false,
    });
  },
});

export const getByPersona = query({
  args: { personaId: v.id("personas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emails")
      .withIndex("by_persona", (q) => q.eq("personaId", args.personaId))
      .first();
  },
});

export const approveAndSend = mutation({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");
    await ctx.db.patch(args.emailId, { approved: true, sent: true });
    return { success: true, message: "Email sequence approved and queued for send" };
  },
});
