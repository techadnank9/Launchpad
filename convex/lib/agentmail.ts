"use node";

import {
  optionalEnv,
  requireEnv,
  assertOk,
  getAgentMailReplyTo,
  getAgentMailSandboxInbox,
} from "./env";

const AGENTMAIL_BASE = "https://api.agentmail.to/v0";

export function isAgentMailConfigured(): boolean {
  return Boolean(
    optionalEnv("AGENTMAIL_API_KEY") && optionalEnv("AGENTMAIL_INBOX_ID"),
  );
}

export function getAgentMailInboxId(): string {
  return requireEnv("AGENTMAIL_INBOX_ID");
}

export type SendAgentMailArgs = {
  /** Who this email is personalized for — never used as the SMTP/API recipient. */
  prospectLabel: string;
  subject: string;
  text: string;
  labels?: string[];
};

export type SendAgentMailResult = {
  messageId: string;
  deliveredTo: string;
};

function assertSandboxInbox(address: string): void {
  if (!address.toLowerCase().endsWith("@agentmail.to")) {
    throw new Error(
      `Outbound blocked — only @agentmail.to sandbox inboxes are allowed (got ${address})`,
    );
  }
}

/** Never sends to real lead/Fiber emails — sandbox inbox only. */
export async function sendAgentMailMessage(
  args: SendAgentMailArgs,
): Promise<SendAgentMailResult> {
  const apiKey = requireEnv("AGENTMAIL_API_KEY");
  const inboxId = getAgentMailInboxId();
  const replyTo = getAgentMailReplyTo();
  const deliveredTo = getAgentMailSandboxInbox();

  assertSandboxInbox(inboxId);
  assertSandboxInbox(deliveredTo);
  if (replyTo) assertSandboxInbox(replyTo);

  const body: Record<string, unknown> = {
    to: deliveredTo,
    subject: args.subject,
    text: args.text,
    labels: [
      ...(args.labels ?? ["autogrow", "outbound"]),
      "sandbox",
    ],
  };
  if (replyTo) {
    body.reply_to = replyTo;
  }

  const response = await assertOk(
    await fetch(
      `${AGENTMAIL_BASE}/inboxes/${encodeURIComponent(inboxId)}/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      },
    ),
    "AgentMail",
  );

  const payload = (await response.json()) as {
    message_id?: string;
    id?: string;
  };
  const messageId = payload.message_id ?? payload.id;
  if (!messageId) {
    throw new Error("AgentMail returned no message id");
  }
  return { messageId, deliveredTo };
}
