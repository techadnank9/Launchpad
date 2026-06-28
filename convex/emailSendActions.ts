"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { brandFromRun } from "./lib/brandContext";
import { sendAgentMailMessage, isAgentMailConfigured } from "./lib/agentmail";
import { personalizeEmailForLead } from "./lib/openai";

function prospectLabel(lead: {
  name: string;
  title: string;
  company: string;
}): string {
  const role = lead.title ? ` · ${lead.title}` : "";
  return `${lead.name}${role} @ ${lead.company}`;
}

function leadFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function fillPlaceholders(
  text: string,
  lead: {
    name: string;
    title: string;
    company: string;
    intentSignals: string[];
  },
): string {
  const firstName = leadFirstName(lead.name);
  const intentSignal =
    lead.intentSignals[0] ?? "your team's current priorities";
  return text
    .replaceAll("{first_name}", firstName)
    .replaceAll("{full_name}", lead.name)
    .replaceAll("{title}", lead.title)
    .replaceAll("{company}", lead.company)
    .replaceAll("{intent_signal}", intentSignal);
}

function addBusinessDays(fromMs: number, businessDays: number): number {
  if (businessDays <= 0) return fromMs;
  const date = new Date(fromMs);
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return date.getTime();
}

export const startLeadSequence = internalAction({
  args: {
    emailId: v.id("emails"),
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const email = await ctx.runQuery(internal.emails.getEmailInternal, {
      emailId: args.emailId,
    });
    const lead = await ctx.runQuery(internal.leads.getLeadInternal, {
      leadId: args.leadId,
    });
    if (!email || !lead) throw new Error("Email or lead not found");
    if (lead.personaId !== email.personaId) {
      throw new Error("Lead does not belong to this persona");
    }

    const existing = await ctx.runQuery(internal.emails.listSendsByLeadInternal, {
      leadId: args.leadId,
    });
    if (existing.some((send) => send.status === "scheduled" || send.status === "sent")) {
      throw new Error("Outbound sequence already started for this lead");
    }

    const run = await ctx.runQuery(internal.agents.helpers.getRun, {
      runId: email.runId,
    });
    const persona = await ctx.runQuery(internal.agents.helpers.getPersona, {
      personaId: email.personaId,
    });
    if (!run || !persona) throw new Error("Run or persona not found");

    const sortedTouches = [...email.touches].sort((a, b) => a.step - b.step);
    let scheduleCursor = Date.now();

    for (const touch of sortedTouches) {
      const waitDays = touch.step === 1 ? 0 : (touch.waitDays ?? 3);
      scheduleCursor = addBusinessDays(scheduleCursor, waitDays);

      const sendId = await ctx.runMutation(internal.emails.insertEmailSend, {
        leadId: args.leadId,
        emailId: args.emailId,
        runId: email.runId,
        personaId: email.personaId,
        step: touch.step,
        label: touch.label,
        subject: email.subject,
        body: fillPlaceholders(touch.body, lead),
        scheduledAt: scheduleCursor,
      });

      const delayMs = Math.max(0, scheduleCursor - Date.now());
      await ctx.scheduler.runAfter(
        delayMs,
        internal.emailSendActions.sendOne,
        { emailSendId: sendId },
      );
    }

    await ctx.runMutation(internal.emails.markSequenceStarted, {
      emailId: args.emailId,
    });
  },
});

export const sendOne = internalAction({
  args: { emailSendId: v.id("emailSends") },
  handler: async (ctx, args) => {
    const send = await ctx.runQuery(internal.emails.getSendInternal, {
      emailSendId: args.emailSendId,
    });
    if (!send || send.status !== "scheduled") return;

    if (send.scheduledAt > Date.now() + 5_000) {
      await ctx.scheduler.runAfter(
        send.scheduledAt - Date.now(),
        internal.emailSendActions.sendOne,
        { emailSendId: args.emailSendId },
      );
      return;
    }

    const [lead, email, run, persona] = await Promise.all([
      ctx.runQuery(internal.leads.getLeadInternal, { leadId: send.leadId }),
      ctx.runQuery(internal.emails.getEmailInternal, { emailId: send.emailId }),
      ctx.runQuery(internal.agents.helpers.getRun, { runId: send.runId }),
      ctx.runQuery(internal.agents.helpers.getPersona, {
        personaId: send.personaId,
      }),
    ]);
    if (!lead) {
      await ctx.runMutation(internal.emails.markSendFailed, {
        emailSendId: args.emailSendId,
        error: "Lead not found",
      });
      return;
    }
    if (!email || !run || !persona) {
      await ctx.runMutation(internal.emails.markSendFailed, {
        emailSendId: args.emailSendId,
        error: "Missing sequence data",
      });
      return;
    }

    const brand = brandFromRun(run, run.productSummary ?? "");
    const label = prospectLabel(lead);
    const touch = email.touches.find((entry) => entry.step === send.step);
    if (!touch) {
      await ctx.runMutation(internal.emails.markSendFailed, {
        emailSendId: args.emailSendId,
        error: "Touch template missing",
      });
      return;
    }

    let subject = send.subject;
    let body = send.body;

    try {
      const personalized = await personalizeEmailForLead({
        brand,
        persona,
        touch: { ...touch, body: send.body },
        subject: send.subject,
        lead: {
          firstName: leadFirstName(lead.name),
          fullName: lead.name,
          title: lead.title,
          company: lead.company,
          intentSignals: lead.intentSignals,
        },
        step: send.step,
      });
      subject = personalized.subject;
      body = personalized.body;
    } catch (error) {
      console.error("Personalization failed, using template:", error);
    }

    if (!isAgentMailConfigured()) {
      await ctx.runMutation(internal.emails.markSendFailed, {
        emailSendId: args.emailSendId,
        error: "AgentMail not configured — add AGENTMAIL_API_KEY and AGENTMAIL_INBOX_ID",
      });
      return;
    }

    try {
      const result = await sendAgentMailMessage({
        prospectLabel: label,
        subject,
        text: body,
        labels: ["autogrow", `step-${send.step}`, send.personaId],
      });

      await ctx.runMutation(internal.emails.markSendDelivered, {
        emailSendId: args.emailSendId,
        subject,
        body,
        agentMailMessageId: result.messageId,
      });

      if (send.step === 1) {
        await ctx.runMutation(internal.leads.advanceLeadStage, {
          leadId: send.leadId,
          stage: "nurture",
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.emails.markSendFailed, {
        emailSendId: args.emailSendId,
        error: error instanceof Error ? error.message : "Send failed",
      });
    }
  },
});
