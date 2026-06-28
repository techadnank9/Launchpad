import type { Doc } from "@/convex/_generated/dataModel";
import { buildIdealCustomerProfiles } from "@/lib/ideal-customers";
import type { BoardLead } from "@/lib/pipeline-board";

export type NetworkNodeType =
  | "hub"
  | "brand"
  | "persona"
  | "pain"
  | "signal"
  | "account"
  | "lead";

export type NetworkNode = {
  id: string;
  name: string;
  type: NetworkNodeType;
  personaId?: string;
  subtitle?: string;
};

export type NetworkLink = {
  source: string;
  target: string;
};

export type BrainNetwork = {
  nodes: NetworkNode[];
  links: NetworkLink[];
};

const NODE_COLORS: Record<NetworkNodeType, string> = {
  hub: "#a78bfa",
  brand: "#c4b5fd",
  persona: "#7dd3fc",
  pain: "#f9a8d4",
  signal: "#fdba74",
  account: "#fcd34d",
  lead: "#86efac",
};

const NODE_SIZES: Record<NetworkNodeType, number> = {
  hub: 10,
  brand: 9,
  persona: 7,
  pain: 4,
  signal: 4,
  account: 5,
  lead: 3,
};

export function networkNodeColor(type: NetworkNodeType): string {
  return NODE_COLORS[type];
}

export function networkNodeSize(type: NetworkNodeType): number {
  return NODE_SIZES[type];
}

class IdRegistry {
  private counts = new Map<string, number>();

  id(prefix: string, label: string): string {
    const base = label
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 64);
    const key = `${prefix}:${base}`;
    const count = this.counts.get(key) ?? 0;
    this.counts.set(key, count + 1);
    return count === 0 ? key : `${key}:${count + 1}`;
  }
}

function addLink(links: NetworkLink[], source: string, target: string) {
  if (source === target) return;
  links.push({ source, target });
}

export function buildBrainNetwork(params: {
  run: Doc<"runs">;
  personas: Doc<"personas">[];
  leads: BoardLead[];
  hostname: string;
}): BrainNetwork {
  const { run, personas, leads, hostname } = params;
  const registry = new IdRegistry();
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const brandName = run.brandCompanyName ?? hostname;

  const hubId = registry.id("hub", "Autogrow Brain");
  const brandId = registry.id("brand", brandName);

  nodes.push({
    id: hubId,
    name: "Autogrow Brain",
    type: "hub",
    subtitle: `${personas.length} personas · ${leads.length} leads`,
  });

  nodes.push({
    id: brandId,
    name: brandName,
    type: "brand",
    subtitle: run.valueProp?.slice(0, 80) ?? run.productSummary?.slice(0, 80),
  });

  addLink(links, hubId, brandId);

  const personaIds = new Map<string, string>();
  const accountIds = new Map<string, string>();

  for (const persona of personas) {
    const personaId = registry.id("persona", persona.name);
    personaIds.set(persona._id, personaId);
    const matched = leads.filter((lead) => lead.personaId === persona._id).length;
    nodes.push({
      id: personaId,
      name: persona.name,
      type: "persona",
      personaId: persona._id,
      subtitle: persona.messagingAngle.slice(0, 80),
    });
    addLink(links, brandId, personaId);
    addLink(links, hubId, personaId);
  }

  for (const lead of leads) {
    const companyKey = lead.company.trim().toLowerCase();
    if (!accountIds.has(companyKey)) {
      const accountId = registry.id("account", lead.company);
      accountIds.set(companyKey, accountId);
      nodes.push({
        id: accountId,
        name: lead.company,
        type: "account",
      });
      addLink(links, brandId, accountId);
    }
  }

  const profiles = buildIdealCustomerProfiles({ personas, leads });

  for (const profile of profiles) {
    const personaNodeId = personaIds.get(profile.personaId);
    if (!personaNodeId) continue;

    const persona = personas.find((item) => item._id === profile.personaId);
    if (!persona) continue;

    for (const pain of persona.painPoints.slice(0, 3)) {
      const painId = registry.id("pain", `${persona.name} — ${pain.slice(0, 40)}`);
      nodes.push({
        id: painId,
        name: pain.length > 48 ? `${pain.slice(0, 48)}…` : pain,
        type: "pain",
        personaId: persona._id,
      });
      addLink(links, personaNodeId, painId);
    }

    for (const signal of profile.signals) {
      const signalId = registry.id("signal", signal.headline);
      nodes.push({
        id: signalId,
        name: signal.headline,
        type: "signal",
        personaId: persona._id,
        subtitle: signal.detail,
      });
      addLink(links, personaNodeId, signalId);
    }

    const personaLeads = leads.filter((lead) => lead.personaId === persona._id);
    for (const lead of personaLeads) {
      const leadId = registry.id("lead", `${lead.name} — ${lead.company}`);
      const accountId = accountIds.get(lead.company.trim().toLowerCase());
      nodes.push({
        id: leadId,
        name: lead.name,
        type: "lead",
        personaId: persona._id,
        subtitle: `${lead.title} · ${lead.company}`,
      });
      addLink(links, personaNodeId, leadId);
      if (accountId) {
        addLink(links, leadId, accountId);
        addLink(links, personaNodeId, accountId);
      }
    }
  }

  return { nodes, links };
}

export function personaIdFromNetworkNode(node: NetworkNode): string | null {
  if (node.type === "persona") return node.personaId ?? null;
  return node.personaId ?? null;
}

function linkEndpoint(value: string | { id: string }): string {
  return typeof value === "object" ? value.id : value;
}

export function neighborhood(
  network: BrainNetwork,
  nodeId: string | null,
): { nodes: Set<string>; links: Set<string> } {
  const nodes = new Set<string>();
  const linkKeys = new Set<string>();
  if (!nodeId) return { nodes, links: linkKeys };

  nodes.add(nodeId);
  for (const link of network.links) {
    const source = linkEndpoint(link.source as string | { id: string });
    const target = linkEndpoint(link.target as string | { id: string });
    if (source === nodeId || target === nodeId) {
      nodes.add(source);
      nodes.add(target);
      linkKeys.add(`${source}--${target}`);
      linkKeys.add(`${target}--${source}`);
    }
  }

  return { nodes, links: linkKeys };
}

export function clusterNeighborhood(
  network: BrainNetwork,
  personaId: string | null,
): { nodes: Set<string>; links: Set<string> } {
  if (!personaId) return { nodes: new Set(), links: new Set() };
  const nodes = new Set<string>();
  const linkKeys = new Set<string>();

  for (const node of network.nodes) {
    if (node.personaId === personaId || node.type === "brand" || node.type === "hub") {
      nodes.add(node.id);
    }
  }

  for (const link of network.links) {
    const source = linkEndpoint(link.source as string | { id: string });
    const target = linkEndpoint(link.target as string | { id: string });
    if (nodes.has(source) && nodes.has(target)) {
      linkKeys.add(`${source}--${target}`);
    }
  }

  return { nodes, links: linkKeys };
}
