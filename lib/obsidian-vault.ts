import type { Doc } from "@/convex/_generated/dataModel";
import { buildIdealCustomerProfiles } from "@/lib/ideal-customers";
import type { BoardLead } from "@/lib/pipeline-board";

export type VaultFile = {
  path: string;
  content: string;
};

export type ObsidianVault = {
  vaultName: string;
  files: VaultFile[];
};

function safeSegment(value: string, maxLen = 72): string {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
  return cleaned || "Untitled";
}

class PathRegistry {
  private counts = new Map<string, number>();

  allocate(folder: string, label: string): string {
    const base = safeSegment(label);
    const key = `${folder}/${base}`;
    const count = this.counts.get(key) ?? 0;
    this.counts.set(key, count + 1);
    const suffix = count === 0 ? "" : ` ${count + 1}`;
    return `${folder}/${base}${suffix}.md`;
  }

  link(path: string): string {
    return `[[${path.replace(/\.md$/, "")}]]`;
  }
}

function frontmatter(props: Record<string, string | number | string[]>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(props)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${JSON.stringify(item)}`);
      }
    } else if (typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

export function buildObsidianVault(params: {
  run: Doc<"runs">;
  personas: Doc<"personas">[];
  leads: BoardLead[];
  hostname: string;
}): ObsidianVault {
  const { run, personas, leads, hostname } = params;
  const registry = new PathRegistry();
  const files: VaultFile[] = [];
  const brandName = run.brandCompanyName ?? hostname;
  const vaultName = `Autogrow - ${safeSegment(brandName, 48)}`;
  const exportedAt = new Date().toISOString();

  const brandPath = registry.allocate("Brand", brandName);
  const hubPath = "Autogrow Brain.md";
  const personaPaths = new Map<string, string>();
  const accountPaths = new Map<string, string>();
  const leadPaths = new Map<string, string>();

  const profiles = buildIdealCustomerProfiles({ personas, leads });

  for (const persona of personas) {
    personaPaths.set(persona._id, registry.allocate("Personas", persona.name));
  }

  for (const lead of leads) {
    const companyKey = lead.company.trim().toLowerCase();
    if (!accountPaths.has(companyKey)) {
      accountPaths.set(
        companyKey,
        registry.allocate("Accounts", lead.company),
      );
    }
  }

  const personaLinks = personas.map((persona) =>
    registry.link(personaPaths.get(persona._id)!),
  );

  for (const profile of profiles) {
    const persona = personas.find((item) => item._id === profile.personaId);
    if (!persona) continue;

    const personaPath = personaPaths.get(persona._id)!;
    const personaLeads = leads.filter((lead) => lead.personaId === persona._id);
    const painLinks: string[] = [];
    const signalLinks: string[] = [];
    const leadLinks: string[] = [];

    for (const pain of persona.painPoints.slice(0, 3)) {
      const painPath = registry.allocate(
        "Pains",
        `${persona.name} — ${pain.slice(0, 40)}`,
      );
      painLinks.push(registry.link(painPath));
      files.push({
        path: painPath,
        content: [
          frontmatter({
            tags: ["autogrow", "pain"],
            persona: persona.name,
          }),
          `# ${pain}`,
          "",
          `Persona: ${registry.link(personaPath)}`,
          `Brand: ${registry.link(brandPath)}`,
          "",
        ].join("\n"),
      });
    }

    for (const signal of profile.signals) {
      const signalPath = registry.allocate("Signals", signal.headline);
      signalLinks.push(registry.link(signalPath));
      files.push({
        path: signalPath,
        content: [
          frontmatter({
            tags: ["autogrow", "signal"],
            persona: persona.name,
            headline: signal.headline,
          }),
          `# ${signal.headline}`,
          "",
          signal.detail,
          "",
          "## Related",
          `- Persona: ${registry.link(personaPath)}`,
          `- Brand: ${registry.link(brandPath)}`,
          "",
        ].join("\n"),
      });
    }

    for (const lead of personaLeads) {
      const accountPath = accountPaths.get(lead.company.trim().toLowerCase())!;
      const leadPath = registry.allocate(
        "Leads",
        `${lead.name} — ${lead.company}`,
      );
      leadPaths.set(lead.id, leadPath);
      leadLinks.push(registry.link(leadPath));
      files.push({
        path: leadPath,
        content: [
          frontmatter({
            tags: ["autogrow", "lead"],
            persona: persona.name,
            company: lead.company,
            intent_score: lead.intentScore,
          }),
          `# ${lead.name}`,
          "",
          `- Title: ${lead.title}`,
          `- Company: ${registry.link(accountPath)}`,
          `- Persona: ${registry.link(personaPath)}`,
          `- Intent score: ${lead.intentScore}`,
          lead.motionScore != null ? `- Motion score: ${lead.motionScore}` : "",
          lead.email ? `- Email: ${lead.email}` : "",
          lead.linkedin ? `- LinkedIn: ${lead.linkedin}` : "",
          "",
          "## Signals",
          ...(lead.intentSignals.filter((item) => !item.startsWith("Deal estimate:"))
            .length > 0
            ? lead.intentSignals
                .filter((item) => !item.startsWith("Deal estimate:"))
                .map((item) => `- ${item}`)
            : ["- _No signals recorded_"]),
          "",
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    const accountLinks = profile.exampleCompanies
      .map((company) => accountPaths.get(company.trim().toLowerCase()))
      .filter(Boolean)
      .map((path) => registry.link(path!));

    const attributeLines = profile.attributes
      .filter((attr) => attr.source === "persona")
      .map((attr) => `- **${attr.label}:** ${attr.value}`);

    const sections = [
      frontmatter({
        tags: ["autogrow", "persona"],
        matched_leads: profile.matchedLeads,
        message_tone: persona.contentTone,
      }),
      `# ${persona.name}`,
      "",
      profile.headline,
      "",
      "## Brand",
      `- ${registry.link(brandPath)}`,
      "",
      "## Ideal customer",
      ...attributeLines,
      "",
    ];

    if (painLinks.length > 0) {
      sections.push("## Pains", ...painLinks.map((link) => `- ${link}`), "");
    }

    sections.push(
      "## Matched accounts",
      ...(accountLinks.length > 0
        ? accountLinks.map((link) => `- ${link}`)
        : ["- _No matched accounts yet_"]),
      "",
      "## Leads",
      ...(leadLinks.length > 0
        ? leadLinks.map((link) => `- ${link}`)
        : ["- _No leads yet_"]),
      "",
      "## Signals",
      ...(signalLinks.length > 0
        ? signalLinks.map((link) => `- ${link}`)
        : ["- _No signals yet_"]),
      "",
      "## Hub",
      `- ${registry.link(hubPath)}`,
      "",
    );

    files.push({
      path: personaPath,
      content: sections.join("\n"),
    });
  }

  for (const [companyKey, accountPath] of accountPaths) {
    const companyLeads = leads.filter(
      (lead) => lead.company.trim().toLowerCase() === companyKey,
    );
    const companyName = companyLeads[0]?.company ?? companyKey;
    const personaLinksForAccount = [
      ...new Set(
        companyLeads.map((lead) =>
          registry.link(personaPaths.get(lead.personaId)!),
        ),
      ),
    ];
    const leadLinksForAccount = companyLeads.map((lead) =>
      registry.link(leadPaths.get(lead.id)!),
    );

    files.push({
      path: accountPath,
      content: [
        frontmatter({
          tags: ["autogrow", "account"],
          company: companyName,
          lead_count: companyLeads.length,
        }),
        `# ${companyName}`,
        "",
        "## Personas",
        ...personaLinksForAccount.map((link) => `- ${link}`),
        "",
        "## Leads",
        ...leadLinksForAccount.map((link) => `- ${link}`),
        "",
        "## Brand",
        `- ${registry.link(brandPath)}`,
        "",
      ].join("\n"),
    });
  }

  files.unshift({
    path: hubPath,
    content: [
      frontmatter({
        tags: ["autogrow", "hub"],
        brand: brandName,
        persona_count: personas.length,
        lead_count: leads.length,
      }),
      `# Autogrow Brain — ${brandName}`,
      "",
      "Growth knowledge graph exported from Autogrow.",
      "",
      "## Brand",
      `- ${registry.link(brandPath)}`,
      "",
      "## Personas",
      ...personaLinks.map((link) => `- ${link}`),
      "",
      "## Stats",
      `- Personas: ${personas.length}`,
      `- Matched leads: ${leads.length}`,
      `- Source: ${run.url}`,
      "",
    ].join("\n"),
  });

  files.unshift({
    path: brandPath,
    content: [
      frontmatter({
        tags: ["autogrow", "brand"],
        company: brandName,
        url: run.url,
      }),
      `# ${brandName}`,
      "",
      run.valueProp ?? run.productSummary ?? "Brand context from site analysis.",
      "",
      run.brandTagline ? `> ${run.brandTagline}` : "",
      "",
      "## Personas",
      ...personaLinks.map((link) => `- ${link}`),
      "",
      "## Hub",
      `- ${registry.link(hubPath)}`,
      "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  files.unshift({
    path: "README.md",
    content: [
      frontmatter({
        tags: ["autogrow"],
        type: "readme",
        brand: brandName,
        exported_at: exportedAt,
      }),
      `# ${vaultName}`,
      "",
      "This folder is an Obsidian vault exported from Autogrow.",
      "",
      "## Open in Obsidian",
      "",
      "1. Unzip this archive.",
      "2. In Obsidian, choose **Open folder as vault** and select the unzipped folder.",
      "3. Open **Graph view** from the left ribbon.",
      "4. Start from " +
        registry.link(hubPath) +
        " or " +
        registry.link(brandPath) +
        ".",
      "",
      "## Optional: Obsidian CLI",
      "",
      "If you use the [Obsidian CLI](https://obsidian.md/help/cli):",
      "",
      "```bash",
      `# After opening the vault once in Obsidian`,
      `obsidian open path="Autogrow Brain.md"`,
      "```",
      "",
      `- Run URL: ${run.url}`,
      `- Exported: ${exportedAt}`,
      "",
    ].join("\n"),
  });

  return { vaultName, files };
}
