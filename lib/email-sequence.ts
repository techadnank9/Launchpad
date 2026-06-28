export type EmailTouch = {
  step: number;
  label?: string;
  body: string;
  waitDays?: number;
};

const DEFAULT_TOUCH_LABELS: Record<number, string> = {
  1: "Opener",
  2: "Follow-up",
  3: "Last ping",
};

const DEFAULT_WAIT_DAYS: Record<number, number> = {
  2: 3,
  3: 3,
};

export function touchWaitDays(touch: EmailTouch): number {
  if (touch.step === 1) return 0;
  return touch.waitDays ?? DEFAULT_WAIT_DAYS[touch.step] ?? 3;
}

export function touchLabel(touch: EmailTouch): string {
  if (touch.label?.trim()) return touch.label.trim();
  return DEFAULT_TOUCH_LABELS[touch.step] ?? `Email ${touch.step}`;
}

export function touchTimelineLabel(
  touch: EmailTouch,
  allTouches: EmailTouch[],
): string {
  const name = touchLabel(touch);
  if (touch.step === 1) return `${name} · today`;
  return `${name} · ~day ${cumulativeDay(touch, allTouches)}`;
}

export function cumulativeDay(touch: EmailTouch, allTouches: EmailTouch[]): number {
  let total = 1;
  for (const t of allTouches) {
    if (t.step <= 1 || t.step > touch.step) continue;
    total += touchWaitDays(t);
  }
  return total;
}

export const SEQUENCE_EXPLAINER =
  "Each lead gets a drip timeline — sends go to the AgentMail sandbox (autogrowreciever@agentmail.to) only. Real prospect inboxes are never emailed.";

export type LeadEmailContext = {
  firstName: string;
  fullName: string;
  title: string;
  company: string;
  intentSignal?: string;
};

export function leadFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function fillEmailPlaceholders(
  text: string,
  lead: LeadEmailContext,
): string {
  return text
    .replaceAll("{first_name}", lead.firstName)
    .replaceAll("{full_name}", lead.fullName)
    .replaceAll("{title}", lead.title)
    .replaceAll("{company}", lead.company)
    .replaceAll("{intent_signal}", lead.intentSignal ?? "your team's priorities");
}

export function addBusinessDays(fromMs: number, businessDays: number): number {
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

export function formatTimelineDate(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return "Today";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function waitLabel(businessDays: number): string {
  if (businessDays <= 0) return "";
  return businessDays === 1
    ? "Wait 1 business day"
    : `Wait ${businessDays} business days`;
}
