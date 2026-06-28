"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

type SocialPlatform = "linkedin" | "twitter" | "instagram";

type SocialAccountDetails = {
  id: string;
  status: string;
  name?: string;
  email?: string;
  handle?: string;
  isDefault?: boolean;
  accountType?: string;
};

type PlatformStatus = {
  platform: SocialPlatform;
  connected: boolean;
  pending: boolean;
  accountId?: string;
  livePublish: boolean;
  primaryAccount?: SocialAccountDetails;
  accounts?: SocialAccountDetails[];
  activeAccounts?: SocialAccountDetails[];
  staleAccounts?: SocialAccountDetails[];
  connectAvailable?: boolean;
};

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; description: string; note?: string }
> = {
  linkedin: {
    label: "LinkedIn",
    description: "Publish approved posts to your LinkedIn profile.",
    note: "Live publishing enabled",
  },
  twitter: {
    label: "X (Twitter)",
    description: "Connect your X account for upcoming publishing.",
  },
  instagram: {
    label: "Instagram",
    description: "Connect a Business Instagram account.",
    note: "Connection only — requires Business account for future publishing",
  },
};

type SocialAccountsPanelProps = {
  callbackUrl?: string;
  compact?: boolean;
};

function sanitizeUserMessage(message: string): string {
  return message.replace(/\bComposio\b/gi, "Authorization");
}

export function SocialAccountsPanel({
  callbackUrl,
  compact = false,
}: SocialAccountsPanelProps) {
  const getStatus = useAction(api.composioActions.getSocialConnectionsStatus);
  const getConnectUrl = useAction(api.composioActions.getSocialConnectUrl);
  const disconnectAccount = useAction(api.composioActions.disconnectSocialAccount);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [busyPlatform, setBusyPlatform] = useState<SocialPlatform | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setError(null);
      const status = await getStatus({});
      setConfigured(status.configured);
      setPlatforms(status.platforms as PlatformStatus[]);
    } catch (e) {
      setConfigured(false);
      setPlatforms([]);
      setError(e instanceof Error ? e.message : "Could not load connection status");
    }
  }, [getStatus]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    function onFocus() {
      void refreshStatus();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshStatus]);

  const hasPending = platforms.some((platform) => platform.pending && !platform.connected);

  useEffect(() => {
    if (!hasPending) return;
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [hasPending, refreshStatus]);

  async function handleDisconnect(platform: SocialPlatform, accountId: string, label: string) {
    const confirmed = window.confirm(
      `Disconnect ${label} from ${PLATFORM_META[platform].label}? You can reconnect anytime.`,
    );
    if (!confirmed) return;

    setDisconnectingId(accountId);
    setError(null);
    try {
      await disconnectAccount({ platform, accountId });
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disconnect account");
    } finally {
      setDisconnectingId(null);
    }
  }

  async function handleConnect(platform: SocialPlatform) {
    setBusyPlatform(platform);
    setError(null);
    try {
      const result = await getConnectUrl({
        platform,
        callbackUrl: callbackUrl ?? window.location.href,
      });
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not connect ${platform}`);
    } finally {
      setBusyPlatform(null);
    }
  }

  if (configured === null) {
    return (
      <div className="animate-pulse rounded-xl border border-[#d4d4cc] bg-white p-6">
        <div className="h-4 w-40 rounded bg-[#ecece7]" />
        <div className="mt-4 space-y-3">
          <div className="h-16 rounded-lg bg-[#ecece7]" />
          <div className="h-16 rounded-lg bg-[#ecece7]" />
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-[#d4d4cc] bg-white p-6">
        <h2 className="text-sm font-medium text-[#0a0a0a]">Social accounts</h2>
        <p className="mt-2 text-sm text-[#52525b]">
          Social publishing is not configured. Add the required keys to{" "}
          <code className="rounded bg-[#ecece7] px-1 py-0.5 text-xs">.env.local</code>{" "}
          and run <code className="rounded bg-[#ecece7] px-1 py-0.5 text-xs">npm run env:sync</code>.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div>
          <h2 className="text-sm font-medium text-[#0a0a0a]">Connected accounts</h2>
          <p className="mt-1 text-sm text-[#52525b]">
            Connect once per platform, then approve posts from the Publish tab.
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {sanitizeUserMessage(error)}
        </p>
      )}

      <div className="grid gap-3">
        {(platforms.length > 0
          ? platforms
          : (["linkedin", "twitter", "instagram"] as SocialPlatform[]).map((platform) => ({
              platform,
              connected: false,
              pending: false,
              livePublish: platform === "linkedin",
              accountId: undefined,
              primaryAccount: undefined,
              accounts: [],
              activeAccounts: [],
              staleAccounts: [],
              connectAvailable: true,
            }))
        ).map((item) => {
          const meta = PLATFORM_META[item.platform];
          const connected = item.connected;
          const pending = item.pending && !connected;
          const canConnect = item.connectAvailable !== false;

          return (
            <div
              key={item.platform}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#d4d4cc] bg-white px-4 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[#0a0a0a]">{meta.label}</p>
                  <StatusBadge connected={connected} pending={pending} />
                  {item.livePublish && connected && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                      Live publish
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#52525b]">{meta.description}</p>
                {meta.note && !connected && canConnect && (
                  <p className="mt-1 text-[11px] text-[#737373]">{meta.note}</p>
                )}
                {connected && item.primaryAccount && (
                  <AccountDetails account={item.primaryAccount} />
                )}
                {connected && (item.activeAccounts?.length ?? 0) > 1 && (
                  <p className="mt-2 text-[11px] text-[#737373]">
                    {item.activeAccounts!.length} active LinkedIn accounts — publishing uses
                    the default one above.
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {connected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void refreshStatus()}
                      className="rounded-md border border-[#d4d4cc] bg-[#fafaf8] px-3 py-1.5 text-xs font-medium text-[#3f3f46] hover:bg-[#ecece7]"
                    >
                      Refresh
                    </button>
                    {item.primaryAccount && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleDisconnect(
                            item.platform,
                            item.primaryAccount!.id,
                            item.primaryAccount!.name ??
                              item.primaryAccount!.email ??
                              PLATFORM_META[item.platform].label,
                          )
                        }
                        disabled={disconnectingId === item.primaryAccount.id}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
                      >
                        {disconnectingId === item.primaryAccount.id
                          ? "Disconnecting…"
                          : "Disconnect"}
                      </button>
                    )}
                  </>
                ) : !canConnect ? (
                  <span className="rounded-md border border-[#d4d4cc] bg-[#fafaf8] px-3 py-1.5 text-xs font-medium text-[#737373]">
                    Setup required
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleConnect(item.platform)}
                    disabled={busyPlatform === item.platform}
                    className="btn-primary rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                  >
                    {busyPlatform === item.platform
                      ? "Opening…"
                      : pending
                        ? "Continue setup"
                        : "Connect"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccountDetails({ account }: { account: SocialAccountDetails }) {
  const displayName = account.name ?? account.handle ?? "Connected account";

  return (
    <div className="mt-3 rounded-lg border border-[#ecece7] bg-[#fafaf8] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-[#0a0a0a]">{displayName}</p>
        {account.isDefault && (
          <span className="rounded-full bg-[#ecece7] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#52525b]">
            Default
          </span>
        )}
      </div>
      <dl className="mt-2 space-y-1 text-xs text-[#52525b]">
        {account.handle && (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-[#737373]">Handle</dt>
            <dd className="truncate">@{account.handle.replace(/^@/, "")}</dd>
          </div>
        )}
        {account.email && (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-[#737373]">Email</dt>
            <dd className="truncate">{account.email}</dd>
          </div>
        )}
        {account.accountType && (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-[#737373]">Type</dt>
            <dd className="truncate">{account.accountType}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-[#737373]">ID</dt>
          <dd className="truncate font-mono text-[11px] text-[#737373]">{account.id}</dd>
        </div>
      </dl>
    </div>
  );
}

function StatusBadge({
  connected,
  pending,
}: {
  connected: boolean;
  pending: boolean;
}) {
  if (connected) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
        Connected
      </span>
    );
  }

  if (pending) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
        Pending
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#ecece7] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#52525b]">
      Not connected
    </span>
  );
}

export function useSocialConnectionSummary() {
  const getStatus = useAction(api.composioActions.getSocialConnectionsStatus);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinAccountName, setLinkedinAccountName] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  const refresh = useCallback(async () => {
    const status = await getStatus({});
    setConfigured(status.configured);
    const linkedin = status.platforms.find((p) => p.platform === "linkedin");
    setLinkedinConnected(Boolean(linkedin?.connected));
    setLinkedinAccountName(
      linkedin?.primaryAccount?.name ??
        linkedin?.primaryAccount?.handle ??
        null,
    );
  }, [getStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onFocus() {
      void refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { configured, linkedinConnected, linkedinAccountName, refresh };
}
