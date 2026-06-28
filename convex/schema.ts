import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const brandSocialStudyValidator = v.object({
  profiles: v.array(
    v.object({
      platform: v.string(),
      url: v.string(),
    }),
  ),
  samplePosts: v.array(
    v.object({
      platform: v.string(),
      text: v.string(),
      source: v.optional(v.string()),
    }),
  ),
  captionVoice: v.string(),
  visualPatterns: v.string(),
  contentThemes: v.array(v.string()),
  hashtags: v.array(v.string()),
});

export default defineSchema({
  sites: defineTable({
    domain: v.string(),
    url: v.string(),
    productSummary: v.optional(v.string()),
    valueProp: v.optional(v.string()),
    brandCompanyName: v.optional(v.string()),
    brandTagline: v.optional(v.string()),
    brandColors: v.optional(v.array(v.string())),
    brandLogoUrl: v.optional(v.string()),
    brandVisualStyle: v.optional(v.string()),
    brandImageryNotes: v.optional(v.string()),
    brandSocialStudy: v.optional(brandSocialStudyValidator),
    composioLinkedInAccountId: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_domain", ["domain"]),

  sitePersonas: defineTable({
    siteId: v.id("sites"),
    slug: v.string(),
    name: v.string(),
    painPoints: v.array(v.string()),
    messagingAngle: v.string(),
    contentTone: v.string(),
    outboundTargets: v.string(),
    posterStyle: v.string(),
    dealSizeMinUsd: v.optional(v.number()),
    dealSizeMaxUsd: v.optional(v.number()),
    pricingModel: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_site", ["siteId"]),

  siteLeads: defineTable({
    siteId: v.id("sites"),
    personaSlug: v.string(),
    personaName: v.string(),
    leadKey: v.string(),
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
    updatedAt: v.number(),
  })
    .index("by_site_persona", ["siteId", "personaSlug"])
    .index("by_site", ["siteId"]),

  runs: defineTable({
    url: v.string(),
    siteId: v.optional(v.id("sites")),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("personas_ready"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    productSummary: v.optional(v.string()),
    valueProp: v.optional(v.string()),
    brandCompanyName: v.optional(v.string()),
    brandTagline: v.optional(v.string()),
    brandColors: v.optional(v.array(v.string())),
    brandLogoUrl: v.optional(v.string()),
    brandVisualStyle: v.optional(v.string()),
    brandImageryNotes: v.optional(v.string()),
    brandSocialStudy: v.optional(brandSocialStudyValidator),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]).index("by_site", ["siteId"]),

  personas: defineTable({
    runId: v.id("runs"),
    name: v.string(),
    painPoints: v.array(v.string()),
    messagingAngle: v.string(),
    contentTone: v.string(),
    outboundTargets: v.string(),
    posterStyle: v.string(),
    dealSizeMinUsd: v.optional(v.number()),
    dealSizeMaxUsd: v.optional(v.number()),
    pricingModel: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    leadCount: v.optional(v.number()),
    posterUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
  }).index("by_run", ["runId"]),

  leads: defineTable({
    personaId: v.id("personas"),
    runId: v.id("runs"),
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
    pipelineStage: v.optional(
      v.union(
        v.literal("inbound"),
        v.literal("new"),
        v.literal("prospecting"),
        v.literal("nurture"),
        v.literal("opportunity"),
        v.literal("customer"),
        v.literal("disqualified"),
      ),
    ),
  })
    .index("by_persona", ["personaId"])
    .index("by_run", ["runId"]),

  emails: defineTable({
    personaId: v.id("personas"),
    runId: v.id("runs"),
    subject: v.string(),
    touches: v.array(
      v.object({
        step: v.number(),
        label: v.optional(v.string()),
        body: v.string(),
        waitDays: v.optional(v.number()),
      }),
    ),
    approved: v.boolean(),
    sent: v.boolean(),
  }).index("by_persona", ["personaId"]),

  emailSends: defineTable({
    leadId: v.id("leads"),
    emailId: v.id("emails"),
    runId: v.id("runs"),
    personaId: v.id("personas"),
    step: v.number(),
    label: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    scheduledAt: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    sentAt: v.optional(v.number()),
    agentMailMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_lead", ["leadId"])
    .index("by_lead_step", ["leadId", "step"])
    .index("by_status_scheduled", ["status", "scheduledAt"]),

  posts: defineTable({
    personaId: v.id("personas"),
    runId: v.id("runs"),
    caption: v.string(),
    posterUrl: v.string(),
    platform: v.union(
      v.literal("linkedin"),
      v.literal("twitter"),
      v.literal("instagram"),
    ),
    scheduledAt: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("posted"),
    ),
    postizId: v.optional(v.string()),
    externalPostId: v.optional(v.string()),
    previousPosterUrl: v.optional(v.string()),
    campaignKey: v.optional(v.string()),
    eventLabel: v.optional(v.string()),
  })
    .index("by_persona", ["personaId"])
    .index("by_run", ["runId"]),

  meetings: defineTable({
    siteId: v.optional(v.id("sites")),
    runId: v.id("runs"),
    personaId: v.id("personas"),
    leadId: v.optional(v.id("leads")),
    title: v.string(),
    leadName: v.string(),
    company: v.string(),
    startsAt: v.number(),
    durationMinutes: v.number(),
    type: v.union(
      v.literal("discovery"),
      v.literal("follow_up"),
      v.literal("demo"),
    ),
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  })
    .index("by_run", ["runId"])
    .index("by_site", ["siteId"])
    .index("by_site_starts", ["siteId", "startsAt"]),
});
