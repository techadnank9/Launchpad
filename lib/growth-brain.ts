import type { Doc } from "@/convex/_generated/dataModel";
import type { BoardLead } from "@/lib/pipeline-board";
import { accountTraitFromSignal } from "@/lib/ideal-customers";

export type BrainNodeType =
  | "site"
  | "persona"
  | "pain"
  | "target"
  | "company"
  | "trait";

export type BrainGraphDetail = "overview" | "focused" | "full";

export type BrainNode = {
  id: string;
  label: string;
  type: BrainNodeType;
  clusterId?: string;
  personaId?: string;
  matchedCount?: number;
  x: number;
  y: number;
  subtitle?: string;
};

export type BrainEdge = {
  id: string;
  from: string;
  to: string;
};

export type BrainCluster = {
  id: string;
  label: string;
  cx: number;
  cy: number;
  radius: number;
};

export type GrowthBrainGraph = {
  nodes: BrainNode[];
  edges: BrainEdge[];
  clusters: BrainCluster[];
  viewBox: string;
};

const NODE_COLORS: Record<BrainNodeType, string> = {
  site: "#c4b5fd",
  persona: "#7dd3fc",
  pain: "#f9a8d4",
  target: "#6ee7b7",
  company: "#fcd34d",
  trait: "#fdba74",
};

const CLUSTER_COLORS = ["#7c3aed", "#0284c7", "#059669", "#d97706", "#db2777"];

export function brainNodeColor(type: BrainNodeType): string {
  return NODE_COLORS[type];
}

function pointAt(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function sectorAngle(index: number, total: number) {
  return (index / total) * Math.PI * 2 - Math.PI / 2;
}

function parseAccountTraits(signals: string[]): string[] {
  const traits = new Set<string>();
  for (const signal of signals) {
    const trait = accountTraitFromSignal(signal);
    if (trait) traits.add(trait);
  }
  return Array.from(traits);
}

export function nodeIdForPersona(personaId: string): string {
  return `persona:${personaId}`;
}

export function personaIdFromNodeId(nodeId: string): string | null {
  if (!nodeId.startsWith("persona:")) return null;
  return nodeId.slice("persona:".length);
}

export function buildGrowthBrainGraph(params: {
  run: Doc<"runs">;
  personas: Doc<"personas">[];
  leads: BoardLead[];
  hostname: string;
  detail?: BrainGraphDetail;
  expandedPersonaId?: string | null;
}): GrowthBrainGraph {
  const {
    run,
    personas,
    leads,
    hostname,
    detail = "focused",
    expandedPersonaId = null,
  } = params;
  const nodes: BrainNode[] = [];
  const edges: BrainEdge[] = [];
  const clusters: BrainCluster[] = [];

  const cx = 400;
  const cy = 300;
  const siteId = "site:root";
  const personaCount = Math.max(personas.length, 1);

  const personaRadius = 128 + Math.max(0, personaCount - 3) * 7;
  const satelliteRadius = 52;
  const companyRadius = 92;
  const traitRadius = 34;
  const includeAllSatellites = detail !== "overview";
  const includeCompanies =
    detail === "full" ||
    (detail === "focused" && expandedPersonaId != null);

  const leadCountByPersona = new Map<string, number>();
  for (const lead of leads) {
    leadCountByPersona.set(
      lead.personaId,
      (leadCountByPersona.get(lead.personaId) ?? 0) + 1,
    );
  }

  nodes.push({
    id: siteId,
    label: run.brandCompanyName ?? hostname,
    type: "site",
    x: cx,
    y: cy,
    subtitle: run.valueProp?.slice(0, 72) ?? run.productSummary?.slice(0, 72),
  });

  const companiesByPersona = new Map<
    string,
    Array<{ company: string; traits: Set<string> }>
  >();

  for (const lead of leads) {
    const key = lead.company.toLowerCase();
    const traits = new Set(parseAccountTraits(lead.intentSignals));
    const list = companiesByPersona.get(lead.personaId) ?? [];
    const existing = list.find((item) => item.company.toLowerCase() === key);
    if (existing) {
      for (const trait of traits) existing.traits.add(trait);
    } else {
      list.push({ company: lead.company, traits });
    }
    companiesByPersona.set(lead.personaId, list);
  }

  personas.forEach((persona, index) => {
    const clusterId = `cluster:${persona._id}`;
    const angle = sectorAngle(index, personaCount);
    const sectorWidth = (Math.PI * 2) / personaCount;
    const personaPos = pointAt(cx, cy, personaRadius, angle);

    const personaId = `persona:${persona._id}`;
    nodes.push({
      id: personaId,
      label: persona.name,
      type: "persona",
      clusterId,
      personaId: persona._id,
      matchedCount: leadCountByPersona.get(persona._id) ?? 0,
      x: personaPos.x,
      y: personaPos.y,
      subtitle: persona.messagingAngle.slice(0, 64),
    });
    edges.push({ id: `e:${siteId}:${personaId}`, from: siteId, to: personaId });

    const isExpanded =
      detail === "full" ||
      (detail === "focused" && expandedPersonaId === persona._id);

    if (includeAllSatellites) {
      persona.painPoints.slice(0, 2).forEach((pain, painIndex) => {
        const painId = `pain:${persona._id}:${painIndex}`;
        const painAngle =
          angle - sectorWidth * 0.16 + painIndex * sectorWidth * 0.16;
        const painPos = pointAt(
          personaPos.x,
          personaPos.y,
          satelliteRadius,
          painAngle,
        );
        nodes.push({
          id: painId,
          label: pain.length > 42 ? `${pain.slice(0, 42)}…` : pain,
          type: "pain",
          clusterId,
          personaId: persona._id,
          x: painPos.x,
          y: painPos.y,
        });
        edges.push({ id: `e:${personaId}:${painId}`, from: personaId, to: painId });
      });

      const targetId = `target:${persona._id}`;
      const targetPos = pointAt(
        personaPos.x,
        personaPos.y,
        satelliteRadius,
        angle + sectorWidth * 0.08,
      );
      const targetLabel =
        persona.outboundTargets.split(",")[0]?.trim() ?? "Buyers";
      nodes.push({
        id: targetId,
        label:
          targetLabel.length > 36 ? `${targetLabel.slice(0, 36)}…` : targetLabel,
        type: "target",
        clusterId,
        personaId: persona._id,
        x: targetPos.x,
        y: targetPos.y,
        subtitle: "ICP target",
      });
      edges.push({ id: `e:${personaId}:${targetId}`, from: personaId, to: targetId });
    }

    if (!includeCompanies || !isExpanded) return;

    const personaCompanies = (companiesByPersona.get(persona._id) ?? []).slice(
      0,
      detail === "full" ? 4 : 3,
    );
    personaCompanies.forEach((entry, companyIndex) => {
      const spread =
        personaCompanies.length === 1
          ? 0
          : -sectorWidth * 0.24 +
            (companyIndex / (personaCompanies.length - 1)) * sectorWidth * 0.48;
      const companyAngle = angle + spread;
      const companyPos = pointAt(
        personaPos.x,
        personaPos.y,
        companyRadius,
        companyAngle,
      );
      const companyId = `company:${persona._id}:${companyIndex}`;
      nodes.push({
        id: companyId,
        label: entry.company,
        type: "company",
        clusterId,
        personaId: persona._id,
        x: companyPos.x,
        y: companyPos.y,
      });
      edges.push({
        id: `e:${personaId}:${companyId}`,
        from: personaId,
        to: companyId,
      });

      const traitLabels = Array.from(entry.traits).slice(0, detail === "full" ? 3 : 1);
      traitLabels.forEach((traitLabel, traitIndex) => {
        const traitAngle = companyAngle - 0.25 + traitIndex * 0.5;
        const traitPos = pointAt(
          companyPos.x,
          companyPos.y,
          traitRadius,
          traitAngle,
        );
        const traitId = `trait:${persona._id}:${companyIndex}:${traitIndex}`;
        nodes.push({
          id: traitId,
          label: traitLabel,
          type: "trait",
          clusterId,
          personaId: persona._id,
          x: traitPos.x,
          y: traitPos.y,
        });
        edges.push({
          id: `e:${companyId}:${traitId}`,
          from: companyId,
          to: traitId,
        });
      });
    });
  });

  for (const persona of personas) {
    const clusterId = `cluster:${persona._id}`;
    const clusterNodes = nodes.filter((node) => node.clusterId === clusterId);
    if (clusterNodes.length === 0) continue;

    let sumX = 0;
    let sumY = 0;
    for (const node of clusterNodes) {
      sumX += node.x;
      sumY += node.y;
    }

    clusters.push({
      id: clusterId,
      label: persona.name,
      cx: sumX / clusterNodes.length,
      cy: sumY / clusterNodes.length,
      radius: 0,
    });
  }

  const viewBox = (() => {
    let minX = cx;
    let minY = cy;
    let maxX = cx;
    let maxY = cy;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    }
    const pad = 48;
    const width = maxX - minX + pad * 2;
    const height = maxY - minY + pad * 2;
    const minSize = 520;
    const finalWidth = Math.max(width, minSize);
    const finalHeight = Math.max(height, minSize * 0.75);
    const extraX = (finalWidth - width) / 2;
    const extraY = (finalHeight - height) / 2;
    return `${minX - pad - extraX} ${minY - pad - extraY} ${finalWidth} ${finalHeight}`;
  })();

  return { nodes, edges, clusters, viewBox };
}

export function clusterStrokeColor(index: number): string {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export function clusterNodeIds(
  graph: GrowthBrainGraph,
  clusterId: string | null,
): Set<string> {
  if (!clusterId) return new Set();
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (node.clusterId === clusterId) ids.add(node.id);
  }
  return ids;
}

export function connectedNodeIds(
  graph: GrowthBrainGraph,
  nodeId: string | null,
): Set<string> {
  if (!nodeId) return new Set();
  const connected = new Set<string>([nodeId]);
  for (const edge of graph.edges) {
    if (edge.from === nodeId) connected.add(edge.to);
    if (edge.to === nodeId) connected.add(edge.from);
  }

  const clusterId = connectedClusterId(graph, nodeId);
  if (clusterId) {
    for (const id of clusterNodeIds(graph, clusterId)) {
      connected.add(id);
    }
  }

  const siteId = "site:root";
  if (connected.has(siteId) || graph.nodes.find((n) => n.id === nodeId)?.type === "site") {
    connected.add(siteId);
  }

  return connected;
}

export function connectedClusterId(
  graph: GrowthBrainGraph,
  nodeId: string | null,
): string | null {
  if (!nodeId) return null;
  const node = graph.nodes.find((n) => n.id === nodeId);
  return node?.clusterId ?? null;
}
