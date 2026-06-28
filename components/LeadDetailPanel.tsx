"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  PIPELINE_COLUMNS,
  type BoardLead,
  type PipelineColumnId,
  columnLabel,
  formatCurrency,
} from "@/lib/pipeline-board";
import { stageLabel } from "@/lib/pipeline";
import { ScoreBadge } from "./ScoreBadge";
import { AccountProfileCard } from "./AccountProfileCard";
import { BrandedPoster } from "./BrandedPoster";
import { PostEditorModal } from "./PostEditorModal";
import { EmailTimeline } from "./EmailTimeline";

type LeadDetailPanelProps = {
  lead: BoardLead;
  runId: Id<"runs">;
  companyName?: string;
  logoUrl?: string;
  brandColor?: string;
  brandColors?: string[];
  onMove: (columnId: PipelineColumnId) => Promise<void>;
  headerExtra?: React.ReactNode;
  className?: string;
};

const platformLabels = {
  linkedin: "LinkedIn",
  twitter: "X",
  instagram: "Instagram",
} as const;

export function LeadDetailPanel({
  lead,
  runId,
  companyName,
  logoUrl,
  brandColor,
  brandColors,
  onMove,
  headerExtra,
  className = "",
}: LeadDetailPanelProps) {
  const email = useQuery(api.emails.getByPersona, {
    personaId: lead.personaId as Id<"personas">,
  });
  const emailSends = useQuery(api.emails.listSendsByLead, {
    leadId: lead.id as Id<"leads">,
  });
  const posts = useQuery(api.posts.listByPersona, {
    personaId: lead.personaId as Id<"personas">,
  });
  const meetings = useQuery(api.meetings.listByRun, { runId });
  const persona = useQuery(api.personas.listByRun, { runId });

  const startSequence = useMutation(api.emails.startSequence);
  const approveCampaign = useMutation(api.posts.approvePersonaCampaign);
  const completeMeeting = useMutation(api.meetings.completeMeeting);

  const [sequenceStarted, setSequenceStarted] = useState(false);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [campaignApproved, setCampaignApproved] = useState(false);
  const [moving, setMoving] = useState(false);
  const [editingPostId, setEditingPostId] = useState<Id<"posts"> | null>(null);

  const personaDoc = persona?.find((p) => p._id === lead.personaId);
  const leadMeeting = useMemo(
    () =>
      meetings?.find(
        (m) =>
          m.leadId === lead.id ||
          (m.company === lead.company && m.personaId === lead.personaId),
      ),
    [meetings, lead],
  );

  async function handleStartSequence() {
    if (!email) return;
    setSequenceError(null);
    try {
      await startSequence({
        emailId: email._id,
        leadId: lead.id as Id<"leads">,
      });
      setSequenceStarted(true);
    } catch (error) {
      setSequenceError(
        error instanceof Error ? error.message : "Could not start sequence",
      );
    }
  }

  const hasActiveSequence =
    sequenceStarted ||
    (emailSends?.some(
      (send) => send.status === "scheduled" || send.status === "sent",
    ) ??
      false);
  const openerSent =
    emailSends?.some((send) => send.step === 1 && send.status === "sent") ?? false;
  const canSend = email && !hasActiveSequence;

  async function handleApproveCampaign() {
    await approveCampaign({ personaId: lead.personaId as Id<"personas"> });
    setCampaignApproved(true);
  }

  const emailQueued = openerSent;
  const postsDone =
    campaignApproved ||
    (posts?.every((p) => p.status === "scheduled" || p.status === "posted") ??
      false);

  return (
    <>
      {editingPostId && posts && posts.length > 0 && (
        <PostEditorModal
          posts={posts}
          initialPostId={editingPostId}
          personaName={personaDoc?.name ?? lead.personaName ?? "Persona"}
          companyName={companyName}
          logoUrl={logoUrl}
          brandColor={brandColor}
          variant="dark"
          onClose={() => setEditingPostId(null)}
        />
      )}
      <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
        <div className="shrink-0 space-y-3 border-b border-white/10 px-5 py-4">
          {headerExtra && (
            <div className="flex justify-end gap-1">{headerExtra}</div>
          )}
          <AccountProfileCard lead={lead} brandColors={brandColors} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <DrawerSection title="Quick actions">
            <div className="flex flex-wrap items-center gap-2">
              <ScoreBadge intentScore={lead.intentScore} />
              <span className="font-mono text-xs text-zinc-500">
                {formatCurrency(lead.value)} potential
              </span>
            </div>
          </DrawerSection>

          <DrawerSection
            title="Outbound email"
            action={
              canSend ? (
                <button
                  type="button"
                  onClick={() => void handleStartSequence()}
                  className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-zinc-200"
                >
                  Send opener
                </button>
              ) : hasActiveSequence ? (
                <span className="text-xs font-medium text-emerald-400">
                  {emailQueued ? "Opener sent" : "Sequence active"}
                </span>
              ) : null
            }
          >
            {!email ? (
              <p className="text-sm text-zinc-500">Writing email sequence…</p>
            ) : (
              <div className="space-y-3">
                {sequenceError && (
                  <p className="text-xs text-red-400">{sequenceError}</p>
                )}
                <p className="text-xs text-zinc-500">
                  Sandbox only — emails go to autogrowreciever@agentmail.to.
                  Fiber emails are shown for context but never contacted.
                </p>
                <EmailTimeline
                  touches={email.touches}
                  sends={emailSends}
                  subject={email.subject}
                  recipientLabel={`${lead.name}${lead.title ? ` · ${lead.title}` : ""}`}
                  variant="dark"
                />
              </div>
            )}
          </DrawerSection>

          <DrawerSection title="Intent signals · Orange Slice">
            {lead.personaDealMin != null && lead.personaDealMax != null && (
              <div className="mb-3 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2.5 text-sm text-sky-100">
                <p className="font-medium">Personalized deal range</p>
                <p className="mt-1 text-xs leading-relaxed text-sky-200/90">
                  {lead.pricingModel} · {formatCurrency(lead.personaDealMin)}–
                  {formatCurrency(lead.personaDealMax)} for{" "}
                  {lead.personaName ?? "this persona"}
                </p>
                {lead.dealValueExplanation && (
                  <p className="mt-2 text-xs text-sky-200/70">
                    {lead.dealValueExplanation}
                  </p>
                )}
                {lead.motionScore != null && (
                  <p className="mt-1 font-mono text-xs text-sky-300">
                    Motion score: {lead.motionScore}/100 →{" "}
                    {formatCurrency(lead.value)}
                  </p>
                )}
              </div>
            )}
            <ul className="space-y-2">
              {lead.intentSignals
                .filter((s) => !s.startsWith("Deal estimate:"))
                .map((signal) => (
                  <li
                    key={signal}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-zinc-300"
                  >
                    {signal}
                  </li>
                ))}
            </ul>
            {lead.intentSignals.filter((s) => !s.startsWith("Deal estimate:"))
              .length === 0 && (
              <p className="text-sm text-zinc-500">No signals yet.</p>
            )}
          </DrawerSection>

          {leadMeeting && (
            <DrawerSection
              title="Meeting"
              action={
                leadMeeting.status === "scheduled" ? (
                  <button
                    type="button"
                    onClick={() =>
                      void completeMeeting({ meetingId: leadMeeting._id })
                    }
                    className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-zinc-200"
                  >
                    Meeting done
                  </button>
                ) : leadMeeting.status === "completed" ? (
                  <span className="text-xs font-medium text-emerald-400">
                    Completed
                  </span>
                ) : null
              }
            >
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2.5">
                <p className="text-sm font-medium text-violet-100">
                  {leadMeeting.title}
                </p>
                <p className="mt-1 text-xs text-violet-300/80">
                  {new Date(leadMeeting.startsAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  · {leadMeeting.durationMinutes} min
                </p>
                <p className="mt-2 text-[11px] text-violet-300/70">
                  Mark done when the call finishes — drag the card to Proposal
                  manually when you’re ready.
                </p>
              </div>
            </DrawerSection>
          )}

          <DrawerSection
            title="Inbound"
            action={
              posts && posts.length > 0 && !postsDone ? (
                <button
                  type="button"
                  onClick={() => void handleApproveCampaign()}
                  className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-zinc-200"
                >
                  Approve campaign
                </button>
              ) : postsDone && posts && posts.length > 0 ? (
                <span className="text-xs font-medium text-emerald-400">
                  Scheduled
                </span>
              ) : null
            }
          >
            {!personaDoc?.posterUrl && !posts?.length ? (
              <p className="text-sm text-zinc-500">Generating poster & captions…</p>
            ) : (
              <div className="space-y-3">
                {(personaDoc?.posterUrl ?? posts?.[0]?.posterUrl) && (
                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <BrandedPoster
                      posterUrl={personaDoc?.posterUrl ?? posts![0]!.posterUrl}
                      companyName={companyName}
                      logoUrl={logoUrl}
                      brandColor={brandColor}
                      className="w-full"
                      imageClassName="w-full object-cover"
                      width={320}
                      height={320}
                    />
                  </div>
                )}
                {(personaDoc?.caption ?? posts?.[0]?.caption) && (
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {personaDoc?.caption ?? posts?.[0]?.caption}
                  </p>
                )}
                {posts && posts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {posts.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => setEditingPostId(p._id)}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200"
                      >
                        {platformLabels[p.platform]} · {p.status}
                        {p.status === "draft" ? " · edit" : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DrawerSection>

          <DrawerSection title="Contact">
            <div className="flex flex-wrap gap-2">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-sky-400 hover:bg-white/5"
                >
                  {lead.email}
                </a>
              )}
              {lead.linkedin && (
                <a
                  href={lead.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-sky-400 hover:bg-white/5"
                >
                  LinkedIn
                </a>
              )}
            </div>
          </DrawerSection>

          <DrawerSection title="Pipeline">
            <dl className="mb-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-zinc-600">Stage</dt>
                <dd className="text-white">{stageLabel(lead.stage)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-600">Column</dt>
                <dd className="text-white">{columnLabel(lead.columnId)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_COLUMNS.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  disabled={moving || lead.columnId === column.id}
                  onClick={async () => {
                    setMoving(true);
                    try {
                      await onMove(column.id);
                    } finally {
                      setMoving(false);
                    }
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-40 ${
                    lead.columnId === column.id
                      ? "border-sky-500 bg-sky-500/20 text-sky-300"
                      : "border-white/15 text-zinc-400 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  {column.label}
                </button>
              ))}
            </div>
          </DrawerSection>
        </div>
      </div>
    </>
  );
}

function DrawerSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
