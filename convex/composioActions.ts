"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { isPostizConfigured } from "./lib/env";
import { loadPosterImage } from "./lib/posterImage";
import { promotePostToSchedule } from "./lib/postiz";
import {
  checkComposioConfigured,
  getAllConnectionStatesMcp,
  getConnectUrl,
  getConnectionStateMcp,
  listLinkedInAccounts,
  publishLinkedInPost,
  removeSocialAccount,
  waitForConnectionMcp,
  type SocialAccountDetails,
  type SocialToolkit,
} from "./lib/composio";
import {
  getToolkitConnectInfo,
  hasComposioProjectApiKey,
  isComposioMcpConfigured,
  getToolkitAuthConfigOverride,
} from "./lib/env";

const socialToolkitValidator = v.union(
  v.literal("linkedin"),
  v.literal("twitter"),
  v.literal("instagram"),
);

export const getSocialConnectionsStatus = action({
  args: {},
  handler: async (): Promise<{
    configured: boolean;
    platforms: Array<{
      platform: SocialToolkit;
      connected: boolean;
      pending: boolean;
      accountId?: string;
      livePublish: boolean;
      primaryAccount?: SocialAccountDetails;
      accounts: SocialAccountDetails[];
      activeAccounts: SocialAccountDetails[];
      staleAccounts: SocialAccountDetails[];
      connectAvailable: boolean;
      setupMessage?: string;
      dashboardConnectUrl: string;
    }>;
  }> => {
    if (!checkComposioConfigured()) {
      return { configured: false, platforms: [] };
    }

    if (isComposioMcpConfigured()) {
      const states = await getAllConnectionStatesMcp();
      return {
        configured: true,
        platforms: states.map((state) => {
          const connectInfo = getToolkitConnectInfo(state.toolkit);
          return {
            platform: state.toolkit,
            connected: state.connected,
            pending: state.pending,
            accountId: state.accountId,
            livePublish: state.toolkit === "linkedin",
            primaryAccount: state.primaryAccount,
            accounts: state.accounts,
            activeAccounts: state.activeAccounts,
            staleAccounts: state.staleAccounts,
            connectAvailable: connectInfo.connectAvailable,
            setupMessage: connectInfo.setupMessage,
            dashboardConnectUrl: connectInfo.dashboardConnectUrl,
          };
        }),
      };
    }

    const linkedinAccounts = await listLinkedInAccounts();
    const primaryAccount = linkedinAccounts[0]
      ? {
          id: linkedinAccounts[0].id,
          status: linkedinAccounts[0].status,
          name: linkedinAccounts[0].name,
          email: linkedinAccounts[0].email,
          handle: linkedinAccounts[0].handle,
          isDefault: linkedinAccounts[0].isDefault,
          accountType: linkedinAccounts[0].accountType,
        }
      : undefined;

    return {
      configured: true,
      platforms: [
        {
          platform: "linkedin",
          connected: linkedinAccounts.length > 0,
          pending: false,
          accountId: linkedinAccounts[0]?.id,
          livePublish: true,
          primaryAccount,
          accounts: linkedinAccounts,
          activeAccounts: linkedinAccounts,
          staleAccounts: [],
          connectAvailable: true,
          dashboardConnectUrl: getToolkitConnectInfo("linkedin").dashboardConnectUrl,
        },
        {
          platform: "twitter",
          connected: false,
          pending: false,
          livePublish: false,
          accounts: [],
          activeAccounts: [],
          staleAccounts: [],
          connectAvailable: true,
          setupMessage: getToolkitConnectInfo("twitter").setupMessage,
          dashboardConnectUrl: getToolkitConnectInfo("twitter").dashboardConnectUrl,
        },
        {
          platform: "instagram",
          connected: false,
          pending: false,
          livePublish: false,
          accounts: [],
          activeAccounts: [],
          staleAccounts: [],
          connectAvailable: true,
          dashboardConnectUrl: getToolkitConnectInfo("instagram").dashboardConnectUrl,
        },
      ],
    };
  },
});

export const refreshSocialConnection = action({
  args: {
    platform: socialToolkitValidator,
    wait: v.optional(v.boolean()),
  },
  handler: async (_ctx, args): Promise<{
    platform: SocialToolkit;
    connected: boolean;
    pending: boolean;
    accountId?: string;
  }> => {
    if (!checkComposioConfigured()) {
      throw new Error("Composio is not configured");
    }

    if (isComposioMcpConfigured() && args.wait) {
      const state = await waitForConnectionMcp(args.platform, 90_000);
      return {
        platform: state.toolkit,
        connected: state.connected,
        pending: state.pending,
        accountId: state.accountId,
      };
    }

    const state = isComposioMcpConfigured()
      ? await getConnectionStateMcp(args.platform)
      : {
          toolkit: "linkedin" as const,
          connected: (await listLinkedInAccounts()).length > 0,
          pending: false,
          accounts: [],
          accountId: (await listLinkedInAccounts())[0]?.id,
        };

    return {
      platform: args.platform,
      connected: state.connected,
      pending: state.pending,
      accountId: state.accountId,
    };
  },
});

export const disconnectSocialAccount = action({
  args: {
    platform: socialToolkitValidator,
    accountId: v.string(),
  },
  handler: async (_ctx, args): Promise<{
    success: boolean;
    connected: boolean;
    pending: boolean;
  }> => {
    if (!checkComposioConfigured()) {
      throw new Error("Composio is not configured");
    }

    const state = await removeSocialAccount(args.platform, args.accountId);
    return {
      success: true,
      connected: state?.connected ?? false,
      pending: state?.pending ?? false,
    };
  },
});

export const getSocialConnectUrl = action({
  args: {
    platform: socialToolkitValidator,
    callbackUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    url: string | null;
    configured: boolean;
    alreadyConnected: boolean;
    error?: string;
  }> => {
    if (!checkComposioConfigured()) {
      return { url: null, configured: false, alreadyConnected: false };
    }

    const connectInfo = getToolkitConnectInfo(args.platform);
    if (!connectInfo.connectAvailable) {
      return {
        url: null,
        configured: true,
        alreadyConnected: false,
        error: connectInfo.setupMessage,
      };
    }

    if (isComposioMcpConfigured()) {
      const state = await getConnectionStateMcp(args.platform);
      if (state.connected) {
        return { url: null, configured: true, alreadyConnected: true };
      }
    } else if (args.platform !== "linkedin") {
      return {
        url: null,
        configured: true,
        alreadyConnected: false,
        error: `${args.platform} requires Composio Connect (consumer key)`,
      };
    } else {
      const accounts = await listLinkedInAccounts();
      if (accounts.length > 0) {
        return { url: null, configured: true, alreadyConnected: true };
      }
    }

    const useDashboardForTwitter =
      args.platform === "twitter" &&
      !getToolkitAuthConfigOverride("twitter") &&
      !hasComposioProjectApiKey();

    if (useDashboardForTwitter) {
      return {
        url: connectInfo.dashboardConnectUrl,
        configured: true,
        alreadyConnected: false,
      };
    }

    try {
      const url = await getConnectUrl(args.callbackUrl, args.platform);
      return { url, configured: true, alreadyConnected: false };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not start connect flow";

      if (args.platform === "twitter") {
        return {
          url: connectInfo.dashboardConnectUrl,
          configured: true,
          alreadyConnected: false,
        };
      }

      return {
        url: null,
        configured: true,
        alreadyConnected: false,
        error: message,
      };
    }
  },
});

export const getLinkedInConnectUrl = action({
  args: {
    callbackUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ url: string | null; configured: boolean }> => {
    if (!checkComposioConfigured()) {
      return { url: null, configured: false };
    }

    const accounts = await listLinkedInAccounts();
    if (accounts.length > 0) {
      return { url: null, configured: true };
    }

    const url = await getConnectUrl(args.callbackUrl, "linkedin");
    return { url, configured: true };
  },
});

export const getLinkedInConnectionStatus = action({
  args: {},
  handler: async (): Promise<{
    configured: boolean;
    connected: boolean;
    accountId?: string;
  }> => {
    if (!checkComposioConfigured()) {
      return { configured: false, connected: false };
    }

    const accounts = await listLinkedInAccounts();
    return {
      configured: true,
      connected: accounts.length > 0,
      accountId: accounts[0]?.id,
    };
  },
});

export const publishPost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(internal.posts.getPost, {
      postId: args.postId,
    });
    if (!post) {
      throw new Error("Post not found");
    }

    if (
      post.platform === "linkedin" &&
      checkComposioConfigured()
    ) {
      const accounts = await listLinkedInAccounts();
      if (accounts.length > 0) {
        const posterImage = post.posterUrl
          ? await loadPosterImage(ctx, post.posterUrl)
          : undefined;

        const result = await publishLinkedInPost({
          caption: post.caption,
          posterUrl: post.posterUrl,
          posterImage,
          connectedAccountId: accounts[0]?.id,
        });

        await ctx.runMutation(internal.posts.markPublished, {
          postId: args.postId,
          externalPostId: result.externalPostId,
        });
        return;
      }
    }

    if (isPostizConfigured() && post.postizId) {
      await promotePostToSchedule(post.postizId);
      await ctx.runMutation(internal.posts.markScheduled, { postId: args.postId });
      return;
    }

    await ctx.runMutation(internal.posts.markScheduled, { postId: args.postId });
  },
});
