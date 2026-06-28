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
import type * as agents_helpers from "../agents/helpers.js";
import type * as agents_leadAgent from "../agents/leadAgent.js";
import type * as agents_posterAgent from "../agents/posterAgent.js";
import type * as agents_schedulerAgent from "../agents/schedulerAgent.js";
import type * as agents_siteAnalyst from "../agents/siteAnalyst.js";
import type * as calendar from "../calendar.js";
import type * as emails from "../emails.js";
import type * as leads from "../leads.js";
import type * as lib_domain from "../lib/domain.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_fiber from "../lib/fiber.js";
import type * as lib_memory from "../lib/memory.js";
import type * as lib_openai from "../lib/openai.js";
import type * as lib_orangeSlice from "../lib/orangeSlice.js";
import type * as lib_pipeline from "../lib/pipeline.js";
import type * as lib_postiz from "../lib/postiz.js";
import type * as lib_scraper from "../lib/scraper.js";
import type * as meetings from "../meetings.js";
import type * as personas from "../personas.js";
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
  "agents/helpers": typeof agents_helpers;
  "agents/leadAgent": typeof agents_leadAgent;
  "agents/posterAgent": typeof agents_posterAgent;
  "agents/schedulerAgent": typeof agents_schedulerAgent;
  "agents/siteAnalyst": typeof agents_siteAnalyst;
  calendar: typeof calendar;
  emails: typeof emails;
  leads: typeof leads;
  "lib/domain": typeof lib_domain;
  "lib/env": typeof lib_env;
  "lib/fiber": typeof lib_fiber;
  "lib/memory": typeof lib_memory;
  "lib/openai": typeof lib_openai;
  "lib/orangeSlice": typeof lib_orangeSlice;
  "lib/pipeline": typeof lib_pipeline;
  "lib/postiz": typeof lib_postiz;
  "lib/scraper": typeof lib_scraper;
  meetings: typeof meetings;
  personas: typeof personas;
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
