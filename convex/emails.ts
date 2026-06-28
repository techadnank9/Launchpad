import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";

const touchValidator = v.object({
  step: v.number(),
  label: v.optional(v.string()),
  body: v.string(),
  waitDays: v.optional(v.number()),
});

const sendStatus = v.union(
  v.literal("scheduled"),
  v.literal("sent"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const insertEmail = internalMutation({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    subject: v.string(),
    touches: v.array(touchValidator),
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

export const upsertSequence = internalMutation({
  args: {
    runId: v.id("runs"),
    personaId: v.id("personas"),
    subject: v.string(),
    touches: v.array(touchValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emails")
      .withIndex("by_persona", (q) => q.eq("personaId", args.personaId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: args.subject,
        touches: args.touches,
        approved: false,
        sent: false,
      });
      return existing._id;
    }

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

export const listSendsByLead = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailSends")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .collect();
  },
});

export const getEmailInternal = internalQuery({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.emailId);
  },
});

export const getSendInternal = internalQuery({
  args: { emailSendId: v.id("emailSends") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.emailSendId);
  },
});

export const listSendsByLeadInternal = internalQuery({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailSends")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .collect();
  },
});

export const insertEmailSend = internalMutation({
  args: {
    leadId: v.id("leads"),
    emailId: v.id("emails"),
    runId: v.id("runs"),
    personaId: v.id("personas"),
    step: v.number(),
    label: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("emailSends", {
      leadId: args.leadId,
      emailId: args.emailId,
      runId: args.runId,
      personaId: args.personaId,
      step: args.step,
      label: args.label,
      subject: args.subject,
      body: args.body,
      scheduledAt: args.scheduledAt,
      status: "scheduled",
    });
  },
});

export const markSequenceStarted = internalMutation({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, { approved: true });
  },
});

export const markSendDelivered = internalMutation({
  args: {
    emailSendId: v.id("emailSends"),
    subject: v.string(),
    body: v.string(),
    agentMailMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailSendId, {
      status: "sent",
      sentAt: Date.now(),
      subject: args.subject,
      body: args.body,
      agentMailMessageId: args.agentMailMessageId,
      error: undefined,
    });
  },
});

export const markSendFailed = internalMutation({
  args: {
    emailSendId: v.id("emailSends"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailSendId, {
      status: "failed",
      error: args.error,
    });
  },
});

/** Start drip for one lead — sends opener now, schedules follow-ups on the timeline. */
export const startSequence = mutation({
  args: {
    emailId: v.id("emails"),
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email sequence not found");

    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    if (lead.personaId !== email.personaId) {
      throw new Error("Lead does not belong to this persona");
    }
    const existing = await ctx.db
      .query("emailSends")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .collect();
    if (existing.some((send) => send.status === "scheduled" || send.status === "sent")) {
      throw new Error("Sequence already active for this lead");
    }

    await ctx.scheduler.runAfter(0, internal.emailSendActions.startLeadSequence, {
      emailId: args.emailId,
      leadId: args.leadId,
    });

    return {
      success: true,
      message:
        "Sending opener to sandbox (autogrowreciever@agentmail.to) — real prospect emails are never contacted",
    };
  },
});

/** @deprecated Use startSequence — kept for any stale UI references */
export const approveAndSend = mutation({
  args: {
    emailId: v.id("emails"),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, args) => {
    if (!args.leadId) {
      throw new Error("Pick a lead and use Send opener — sequences send per contact");
    }
    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");

    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    if (lead.personaId !== email.personaId) {
      throw new Error("Lead does not belong to this persona");
    }

    await ctx.scheduler.runAfter(0, internal.emailSendActions.startLeadSequence, {
      emailId: args.emailId,
      leadId: args.leadId,
    });

    return {
      success: true,
      message: "Opener queued (sandbox only — autogrowreciever@agentmail.to)",
    };
  },
});
