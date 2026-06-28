"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";

const platformLabels: Record<Doc<"posts">["platform"], string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  instagram: "Instagram",
};

const platformCaptionLimits: Record<Doc<"posts">["platform"], number> = {
  linkedin: 3000,
  twitter: 280,
  instagram: 2200,
};

const PLATFORM_ORDER: Doc<"posts">["platform"][] = [
  "linkedin",
  "twitter",
  "instagram",
];

type PostEditorModalProps = {
  posts: Doc<"posts">[];
  personaName: string;
  initialPostId?: Id<"posts">;
  onClose: () => void;
  onPosted?: (postId: Id<"posts">) => void;
  variant?: "light" | "dark";
};

export function PostEditorModal({
  posts,
  personaName,
  initialPostId,
  onClose,
  onPosted,
  variant = "light",
}: PostEditorModalProps) {
  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) =>
          PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform),
      ),
    [posts],
  );

  const [activePostId, setActivePostId] = useState<Id<"posts">>(
    initialPostId ?? sortedPosts[0]!._id,
  );

  const activePost =
    sortedPosts.find((post) => post._id === activePostId) ?? sortedPosts[0]!;

  const saveCaption = useMutation(api.posts.saveCaption);
  const applyCaptionFeedback = useAction(api.postPublicActions.applyCaptionFeedback);
  const applyPosterFeedback = useAction(api.postPublicActions.applyPosterFeedback);
  const confirmPoster = useMutation(api.posts.confirmPosterRevision);
  const revertPoster = useMutation(api.posts.revertPosterRevision);
  const approvePost = useMutation(api.posts.approveAndPost);

  const [captionDraft, setCaptionDraft] = useState(activePost.caption);
  const [captionAiHint, setCaptionAiHint] = useState("");
  const [posterFeedback, setPosterFeedback] = useState("");
  const [busy, setBusy] = useState<
    "caption" | "captionAi" | "posterAi" | "confirmPoster" | "revertPoster" | "approve" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const captionDirtyRef = useRef(false);

  useEffect(() => {
    captionDirtyRef.current = false;
    setCaptionDraft(activePost.caption);
    setCaptionAiHint("");
    setPosterFeedback("");
    setError(null);
  }, [activePost._id, activePost.caption]);

  const isDark = variant === "dark";
  const shell = isDark
    ? "border-white/10 bg-zinc-950 text-zinc-100"
    : "border-[#d4d4cc] bg-white text-[#0a0a0a]";
  const muted = isDark ? "text-zinc-400" : "text-[#52525b]";
  const field = isDark
    ? "border-white/15 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
    : "border-[#d4d4cc] bg-[#fafaf8] text-[#0a0a0a] placeholder:text-[#a1a1aa]";
  const chip = isDark
    ? "border-white/10 bg-white/5 text-zinc-300"
    : "border-[#ecece7] bg-[#fafaf8] text-[#3f3f46]";
  const sectionBorder = isDark ? "border-white/10" : "border-[#ecece7]";
  const tabActive = isDark
    ? "bg-white text-black"
    : "bg-[#0a0a0a] text-white";
  const tabIdle = isDark
    ? "border border-white/15 text-zinc-300 hover:bg-white/10"
    : "border border-[#d4d4cc] text-[#52525b] hover:bg-[#ecece7]";
  const tabPosted = isDark
    ? "border border-emerald-500/40 text-emerald-300"
    : "border border-emerald-200 text-emerald-800";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isLocked =
    activePost.status === "posted" || activePost.status === "scheduled";
  const captionLimit = platformCaptionLimits[activePost.platform];
  const captionOverLimit = captionDraft.length > captionLimit;
  const hasPendingPoster = Boolean(activePost.previousPosterUrl);
  const isPosterWorking = busy === "posterAi";

  function switchPlatform(postId: Id<"posts">) {
    if (postId === activePostId) return;
    if (captionDirtyRef.current) {
      setError("Save your caption changes before switching platforms.");
      return;
    }
    setActivePostId(postId);
  }

  async function handleSaveCaption() {
    setError(null);
    setBusy("caption");
    try {
      await saveCaption({ postId: activePost._id, caption: captionDraft });
      captionDirtyRef.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save caption");
    } finally {
      setBusy(null);
    }
  }

  async function handleCaptionAi() {
    if (!captionDraft.trim()) {
      setError("Write a caption first, then ask AI to refine it.");
      return;
    }
    setError(null);
    setBusy("captionAi");
    try {
      const result = await applyCaptionFeedback({
        postId: activePost._id,
        currentCaption: captionDraft,
        instructions: captionAiHint,
      });
      setCaptionDraft(result.caption);
      setCaptionAiHint("");
      captionDirtyRef.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refine caption");
    } finally {
      setBusy(null);
    }
  }

  async function handlePosterAi() {
    setError(null);
    setBusy("posterAi");
    try {
      await applyPosterFeedback({
        postId: activePost._id,
        instructions: posterFeedback,
      });
      setPosterFeedback("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not edit poster");
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirmPoster() {
    setError(null);
    setBusy("confirmPoster");
    try {
      await confirmPoster({ postId: activePost._id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm poster");
    } finally {
      setBusy(null);
    }
  }

  async function handleRevertPoster() {
    setError(null);
    setBusy("revertPoster");
    try {
      await revertPoster({ postId: activePost._id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revert poster");
    } finally {
      setBusy(null);
    }
  }

  async function handlePost() {
    if (hasPendingPoster) {
      setError("Confirm or revert the new poster before posting.");
      return;
    }
    if (captionDirtyRef.current) {
      setError("Save your caption changes before posting.");
      return;
    }
    setError(null);
    setBusy("approve");
    try {
      await approvePost({ postId: activePost._id });
      onPosted?.(activePost._id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish post");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border shadow-xl ${shell}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-editor-title"
      >
        <div
          className={`sticky top-0 z-10 border-b ${
            isDark ? "border-white/10 bg-zinc-950" : "border-[#ecece7] bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>
                {personaName}
              </p>
              <h2 id="post-editor-title" className="mt-0.5 text-base font-medium">
                Campaign post
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-md px-2 py-1 text-sm ${muted} hover:opacity-80`}
            >
              Close
            </button>
          </div>

          <div className="flex flex-wrap gap-2 px-5 pb-4">
            {sortedPosts.map((post) => {
              const selected = post._id === activePostId;
              const posted = post.status === "posted";
              return (
                <button
                  key={post._id}
                  type="button"
                  onClick={() => switchPlatform(post._id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    selected
                      ? tabActive
                      : posted
                        ? tabPosted
                        : tabIdle
                  }`}
                >
                  {platformLabels[post.platform]}
                  {posted ? " · posted" : post.status === "scheduled" ? " · queued" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5 p-5">
          <section className={`space-y-3 border-b pb-5 ${sectionBorder}`}>
            <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>
              Poster
            </p>

            {hasPendingPoster && activePost.previousPosterUrl ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={`mb-1.5 text-[10px] font-medium uppercase ${muted}`}>
                    Previous
                  </p>
                  <div className="overflow-hidden rounded-lg border border-inherit">
                    <Image
                      src={activePost.previousPosterUrl}
                      alt="Previous poster"
                      width={256}
                      height={256}
                      className="aspect-square w-full object-cover"
                      unoptimized
                    />
                  </div>
                </div>
                <div>
                  <p className={`mb-1.5 text-[10px] font-medium uppercase ${muted}`}>
                    New
                  </p>
                  <div className="overflow-hidden rounded-lg border-2 border-emerald-500/60">
                    <Image
                      key={activePost.posterUrl}
                      src={activePost.posterUrl}
                      alt="New poster"
                      width={256}
                      height={256}
                      className="aspect-square w-full object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-inherit">
                {activePost.posterUrl ? (
                  <Image
                    key={activePost.posterUrl}
                    src={activePost.posterUrl}
                    alt=""
                    width={512}
                    height={512}
                    className="aspect-square w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className={`flex aspect-square items-center justify-center text-sm ${muted}`}>
                    No poster
                  </div>
                )}
              </div>
            )}

            {hasPendingPoster && !isLocked && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void handleConfirmPoster()}
                  className="btn-primary flex-1 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {busy === "confirmPoster" ? "Saving…" : "Use new poster"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void handleRevertPoster()}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                    isDark
                      ? "border-white/15 hover:bg-white/10"
                      : "border-[#d4d4cc] hover:bg-[#ecece7]"
                  }`}
                >
                  {busy === "revertPoster" ? "Restoring…" : "Keep previous"}
                </button>
              </div>
            )}

            {!isLocked && (
              <>
                <textarea
                  value={posterFeedback}
                  onChange={(e) => setPosterFeedback(e.target.value)}
                  placeholder={
                    hasPendingPoster
                      ? "Not happy with the new version? Describe another tweak…"
                      : "Describe what to change — e.g. warmer lighting, zoom in on product, add a corgi, less empty space…"
                  }
                  rows={2}
                  className={`w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 ${field}`}
                />
                <button
                  type="button"
                  disabled={isPosterWorking || !posterFeedback.trim() || busy !== null}
                  onClick={() => void handlePosterAi()}
                  className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    isDark
                      ? "border-white/15 bg-white/10 hover:bg-white/15"
                      : "border-[#d4d4cc] bg-[#fafaf8] hover:bg-[#ecece7]"
                  }`}
                >
                  {isPosterWorking
                    ? "Editing poster… (15–30s)"
                    : hasPendingPoster
                      ? "Try another edit"
                      : "Edit poster with AI"}
                </button>
              </>
            )}
          </section>

          <section className={`space-y-3 border-b pb-5 ${sectionBorder}`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>
                Caption · {platformLabels[activePost.platform]}
              </p>
              <span className={`text-[10px] ${captionOverLimit ? "text-red-500" : muted}`}>
                {captionDraft.length}/{captionLimit}
              </span>
            </div>

            {!isLocked ? (
              <>
                <textarea
                  value={captionDraft}
                  onChange={(e) => {
                    captionDirtyRef.current = true;
                    setCaptionDraft(e.target.value);
                  }}
                  rows={4}
                  className={`w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-black/10 ${field}`}
                />
                <button
                  type="button"
                  disabled={busy !== null || captionOverLimit || !captionDraft.trim()}
                  onClick={() => void handleSaveCaption()}
                  className={`w-full rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                    isDark
                      ? "border-white/15 bg-white/10 hover:bg-white/15"
                      : "border-[#d4d4cc] bg-[#fafaf8] hover:bg-[#ecece7]"
                  }`}
                >
                  {busy === "caption" ? "Saving…" : "Save caption"}
                </button>

                <div className={`rounded-lg border p-3 ${chip}`}>
                  <p className={`mb-2 text-xs ${muted}`}>
                    Or refine with AI (optional)
                  </p>
                  <textarea
                    value={captionAiHint}
                    onChange={(e) => setCaptionAiHint(e.target.value)}
                    placeholder="e.g. shorter, add emoji, stronger CTA…"
                    rows={2}
                    className={`mb-2 w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none ${field}`}
                  />
                  <button
                    type="button"
                    disabled={busy !== null || !captionAiHint.trim() || !captionDraft.trim()}
                    onClick={() => void handleCaptionAi()}
                    className={`w-full rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 ${
                      isDark ? "border-white/15" : "border-[#d4d4cc]"
                    }`}
                  >
                    {busy === "captionAi" ? "Refining…" : "Refine caption with AI"}
                  </button>
                </div>
              </>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {activePost.caption}
              </p>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase ${chip}`}>
              {activePost.status}
            </span>
            {hasPendingPoster && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
                Poster review pending
              </span>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-2 border-t border-inherit pt-4">
            {activePost.status !== "posted" ? (
              <button
                type="button"
                disabled={busy !== null || hasPendingPoster}
                onClick={() => void handlePost()}
                className="btn-primary flex-1 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {busy === "approve"
                  ? "Posting…"
                  : `Post to ${platformLabels[activePost.platform]}`}
              </button>
            ) : (
              <span className="flex-1 text-center text-sm font-medium text-emerald-700">
                Posted to {platformLabels[activePost.platform]}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
