/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_copyAgent from "../agents/copyAgent.js";
import type * as agents_eventCampaignAgent from "../agents/eventCampaignAgent.js";
import type * as agents_helpers from "../agents/helpers.js";
import type * as agents_leadAgent from "../agents/leadAgent.js";
import type * as agents_posterAgent from "../agents/posterAgent.js";
import type * as agents_schedulerAgent from "../agents/schedulerAgent.js";
import type * as agents_siteAnalyst from "../agents/siteAnalyst.js";
import type * as brandActions from "../brandActions.js";
import type * as calendar from "../calendar.js";
import type * as composioActions from "../composioActions.js";
import type * as emailActions from "../emailActions.js";
import type * as emailSendActions from "../emailSendActions.js";
import type * as emails from "../emails.js";
import type * as leadActions from "../leadActions.js";
import type * as leads from "../leads.js";
import type * as lib_agentmail from "../lib/agentmail.js";
import type * as lib_brandColors from "../lib/brandColors.js";
import type * as lib_brandContext from "../lib/brandContext.js";
import type * as lib_composio from "../lib/composio.js";
import type * as lib_composioFileUpload from "../lib/composioFileUpload.js";
import type * as lib_composioMcp from "../lib/composioMcp.js";
import type * as lib_composioProjectSdk from "../lib/composioProjectSdk.js";
import type * as lib_dealValue from "../lib/dealValue.js";
import type * as lib_domain from "../lib/domain.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_fiber from "../lib/fiber.js";
import type * as lib_marketingEvents from "../lib/marketingEvents.js";
import type * as lib_memory from "../lib/memory.js";
import type * as lib_openai from "../lib/openai.js";
import type * as lib_orangeSlice from "../lib/orangeSlice.js";
import type * as lib_pipeline from "../lib/pipeline.js";
import type * as lib_posterImage from "../lib/posterImage.js";
import type * as lib_postiz from "../lib/postiz.js";
import type * as lib_scraper from "../lib/scraper.js";
import type * as lib_socialStudy from "../lib/socialStudy.js";
import type * as lib_socialStudyTypes from "../lib/socialStudyTypes.js";
import type * as meetings from "../meetings.js";
import type * as personas from "../personas.js";
import type * as postActions from "../postActions.js";
import type * as postPublicActions from "../postPublicActions.js";
import type * as postizActions from "../postizActions.js";
import type * as posts from "../posts.js";
import type * as runs from "../runs.js";
import type * as sites from "../sites.js";
import type * as workflow from "../workflow.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/copyAgent": typeof agents_copyAgent;
  "agents/eventCampaignAgent": typeof agents_eventCampaignAgent;
  "agents/helpers": typeof agents_helpers;
  "agents/leadAgent": typeof agents_leadAgent;
  "agents/posterAgent": typeof agents_posterAgent;
  "agents/schedulerAgent": typeof agents_schedulerAgent;
  "agents/siteAnalyst": typeof agents_siteAnalyst;
  brandActions: typeof brandActions;
  calendar: typeof calendar;
  composioActions: typeof composioActions;
  emailActions: typeof emailActions;
  emailSendActions: typeof emailSendActions;
  emails: typeof emails;
  leadActions: typeof leadActions;
  leads: typeof leads;
  "lib/agentmail": typeof lib_agentmail;
  "lib/brandColors": typeof lib_brandColors;
  "lib/brandContext": typeof lib_brandContext;
  "lib/composio": typeof lib_composio;
  "lib/composioFileUpload": typeof lib_composioFileUpload;
  "lib/composioMcp": typeof lib_composioMcp;
  "lib/composioProjectSdk": typeof lib_composioProjectSdk;
  "lib/dealValue": typeof lib_dealValue;
  "lib/domain": typeof lib_domain;
  "lib/env": typeof lib_env;
  "lib/fiber": typeof lib_fiber;
  "lib/marketingEvents": typeof lib_marketingEvents;
  "lib/memory": typeof lib_memory;
  "lib/openai": typeof lib_openai;
  "lib/orangeSlice": typeof lib_orangeSlice;
  "lib/pipeline": typeof lib_pipeline;
  "lib/posterImage": typeof lib_posterImage;
  "lib/postiz": typeof lib_postiz;
  "lib/scraper": typeof lib_scraper;
  "lib/socialStudy": typeof lib_socialStudy;
  "lib/socialStudyTypes": typeof lib_socialStudyTypes;
  meetings: typeof meetings;
  personas: typeof personas;
  postActions: typeof postActions;
  postPublicActions: typeof postPublicActions;
  postizActions: typeof postizActions;
  posts: typeof posts;
  runs: typeof runs;
  sites: typeof sites;
  workflow: typeof workflow;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
