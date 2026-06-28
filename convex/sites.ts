import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { personaSlug } from "./lib/memory";
import { brandSocialStudyValidator } from "./schema";

const personaShape = v.object({
  name: v.string(),
  painPoints: v.array(v.string()),
  messagingAngle: v.string(),
  contentTone: v.string(),
  outboundTargets: v.string(),
  posterStyle: v.string(),
  dealSizeMinUsd: v.optional(v.number()),
  dealSizeMaxUsd: v.optional(v.number()),
  pricingModel: v.optional(v.string()),
});

const leadShape = v.object({
  name: v.string(),
  title: v.string(),
  company: v.string(),
  email: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  intentScore: v.number(),
  intentSignals: v.array(v.string()),
  motionScore: v.optional(v.number()),
  estimatedDealValue: v.optional(v.number()),
  dealValueExplanation: v.optional(v.string()),
  pipelineStage: v.union(
    v.literal("inbound"),
    v.literal("new"),
    v.literal("prospecting"),
    v.literal("nurture"),
    v.literal("opportunity"),
    v.literal("customer"),
    v.literal("disqualified"),
  ),
});

export const getOrCreate = internalMutation({
  args: { domain: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sites")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        url: args.url,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("sites", {
      domain: args.domain,
      url: args.url,
      updatedAt: Date.now(),
    });
  },
});

export const attachRun = internalMutation({
  args: { runId: v.id("runs"), siteId: v.id("sites") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, { siteId: args.siteId });
  },
});

export const getSiteById = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.siteId);
  },
});

export const updateBrandSocialStudy = internalMutation({
  args: {
    siteId: v.id("sites"),
    brandSocialStudy: brandSocialStudyValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.siteId, {
      brandSocialStudy: args.brandSocialStudy,
      updatedAt: Date.now(),
    });
  },
});

export const updateSiteProfile = internalMutation({
  args: {
    siteId: v.id("sites"),
    productSummary: v.string(),
    valueProp: v.string(),
    brandCompanyName: v.string(),
    brandTagline: v.string(),
    brandColors: v.array(v.string()),
    brandLogoUrl: v.optional(v.string()),
    brandVisualStyle: v.string(),
    brandImageryNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const { siteId, ...profile } = args;
    await ctx.db.patch(siteId, {
      ...profile,
      updatedAt: Date.now(),
    });
  },
});

export const listPersonas = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sitePersonas")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
  },
});

export const replacePersonas = internalMutation({
  args: {
    siteId: v.id("sites"),
    personas: v.array(personaShape),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sitePersonas")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    for (const persona of args.personas) {
      await ctx.db.insert("sitePersonas", {
        siteId: args.siteId,
        slug: personaSlug(persona.name),
        ...persona,
        updatedAt: Date.now(),
      });
    }
  },
});

export const listLeadsForPersona = internalQuery({
  args: { siteId: v.id("sites"), personaSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("siteLeads")
      .withIndex("by_site_persona", (q) =>
        q.eq("siteId", args.siteId).eq("personaSlug", args.personaSlug),
      )
      .collect();
  },
});

export const replaceLeadsForPersona = internalMutation({
  args: {
    siteId: v.id("sites"),
    personaSlug: v.string(),
    personaName: v.string(),
    leads: v.array(leadShape),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("siteLeads")
      .withIndex("by_site_persona", (q) =>
        q.eq("siteId", args.siteId).eq("personaSlug", args.personaSlug),
      )
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    for (const lead of args.leads) {
      await ctx.db.insert("siteLeads", {
        siteId: args.siteId,
        personaSlug: args.personaSlug,
        personaName: args.personaName,
        leadKey:
          lead.linkedin?.trim().toLowerCase() ??
          `${lead.name.toLowerCase()}|${lead.company.toLowerCase()}`,
        ...lead,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getSiteForRun = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run?.siteId) return null;

    const site = await ctx.db.get(run.siteId);
    if (!site) return null;

    const personaCount = (
      await ctx.db
        .query("sitePersonas")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect()
    ).length;

    const leadCount = (
      await ctx.db
        .query("siteLeads")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect()
    ).length;

    return { site, personaCount, leadCount };
  },
});

export const listSites = query({
  args: {},
  handler: async (ctx) => {
    const sites = await ctx.db.query("sites").collect();
    sites.sort((a, b) => b.updatedAt - a.updatedAt);
    const recent = sites.slice(0, 20);

    return await Promise.all(
      recent.map(async (site) => {
        const personaCount = (
          await ctx.db
            .query("sitePersonas")
            .withIndex("by_site", (q) => q.eq("siteId", site._id))
            .collect()
        ).length;

        const leadCount = (
          await ctx.db
            .query("siteLeads")
            .withIndex("by_site", (q) => q.eq("siteId", site._id))
            .collect()
        ).length;

        const latestRun = await ctx.db
          .query("runs")
          .withIndex("by_site", (q) => q.eq("siteId", site._id))
          .order("desc")
          .first();

        return {
          siteId: site._id,
          domain: site.domain,
          url: site.url,
          brandCompanyName: site.brandCompanyName,
          personaCount,
          leadCount,
          latestRunId: latestRun?._id ?? null,
          updatedAt: site.updatedAt,
        };
      }),
    );
  },
});

export const getSite = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    if (!site) return null;

    const personaCount = (
      await ctx.db
        .query("sitePersonas")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect()
    ).length;

    const leadCount = (
      await ctx.db
        .query("siteLeads")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect()
    ).length;

    const latestRun = await ctx.db
      .query("runs")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .order("desc")
      .first();

    return { site, personaCount, leadCount, latestRunId: latestRun?._id ?? null };
  },
});
