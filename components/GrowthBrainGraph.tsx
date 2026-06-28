"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  buildBrainNetwork,
  clusterNeighborhood,
  networkNodeColor,
  networkNodeSize,
  neighborhood,
  personaIdFromNetworkNode,
  type NetworkNode,
  type NetworkNodeType,
} from "@/lib/brain-network";
import type { Doc } from "@/convex/_generated/dataModel";
import type { BoardLead } from "@/lib/pipeline-board";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type GrowthBrainGraphProps = {
  run: Doc<"runs">;
  personas: Doc<"personas">[];
  leads: BoardLead[];
  hostname: string;
  selectedPersonaId?: string | null;
  onSelectPersona?: (personaId: string | null) => void;
};

const LEGEND: Array<[NetworkNodeType, string]> = [
  ["hub", "Hub"],
  ["brand", "Brand"],
  ["persona", "Persona"],
  ["pain", "Pain"],
  ["signal", "Signal"],
  ["account", "Account"],
  ["lead", "Lead"],
];

export function GrowthBrainGraph({
  run,
  personas,
  leads,
  hostname,
  selectedPersonaId = null,
  onSelectPersona,
}: GrowthBrainGraphProps) {
  const graphRef = useRef<unknown>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });
  const [hoverNode, setHoverNode] = useState<NetworkNode | null>(null);

  const network = useMemo(
    () => buildBrainNetwork({ run, personas, leads, hostname }),
    [run, personas, leads, hostname],
  );

  const selectedPersonaNodeId = useMemo(() => {
    if (!selectedPersonaId) return null;
    return (
      network.nodes.find(
        (node) => node.type === "persona" && node.personaId === selectedPersonaId,
      )?.id ?? null
    );
  }, [network.nodes, selectedPersonaId]);

  const focusNodeId = hoverNode?.id ?? selectedPersonaNodeId;
  const focusPersonaId =
    hoverNode ? personaIdFromNetworkNode(hoverNode) : selectedPersonaId;

  const highlight = useMemo(() => {
    if (focusPersonaId) {
      return clusterNeighborhood(network, focusPersonaId);
    }
    if (focusNodeId) {
      return neighborhood(network, focusNodeId);
    }
    return { nodes: new Set<string>(), links: new Set<string>() };
  }, [network, focusNodeId, focusPersonaId]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({
        width: Math.max(320, width),
        height: Math.max(420, height),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const api = graphRef.current as {
      centerAt?: (x: number, y: number, ms?: number) => void;
      zoom?: (level: number, ms?: number) => void;
    } | null;
    if (!selectedPersonaNodeId || !api?.centerAt || !api?.zoom) return;
    const node = network.nodes.find((item) => item.id === selectedPersonaNodeId) as
      | (NetworkNode & { x?: number; y?: number })
      | undefined;
    if (!node || node.x == null || node.y == null) return;
    api.centerAt(node.x, node.y, 800);
    api.zoom(2.2, 800);
  }, [network.nodes, selectedPersonaNodeId]);

  const resetView = useCallback(() => {
    onSelectPersona?.(null);
    const api = graphRef.current as { zoomToFit?: (ms?: number, padding?: number) => void } | null;
    api?.zoomToFit?.(500, 80);
  }, [onSelectPersona]);

  const handleNodeClick = useCallback(
    (node: NetworkNode) => {
      const personaId = personaIdFromNetworkNode(node);
      if (personaId) {
        onSelectPersona?.(
          selectedPersonaId === personaId ? null : personaId,
        );
        return;
      }
      if (node.type === "brand" || node.type === "hub") {
        onSelectPersona?.(null);
      }
    },
    [onSelectPersona, selectedPersonaId],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Growth brain
          </p>
          <p className="mt-0.5 text-sm text-zinc-300">
            Drag nodes · scroll to zoom · click a persona to focus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetView}
            className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/5"
          >
            Reset view
          </button>
          <div className="hidden flex-wrap gap-2 lg:flex">
            {LEGEND.map(([type, label]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: networkNodeColor(type) }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative h-[min(560px,72vh)] min-h-[440px] w-full bg-[#0d0d0d]"
      >
        <ForceGraph2D
          ref={graphRef as RefObject<never>}
          width={dimensions.width}
          height={dimensions.height}
          graphData={network}
          backgroundColor="#0d0d0d"
          nodeId="id"
          nodeLabel={(node) => {
            const item = node as NetworkNode;
            return item.subtitle ? `${item.name}\n${item.subtitle}` : item.name;
          }}
          nodeVal={(node) => networkNodeSize((node as NetworkNode).type)}
          nodeColor={(node) => {
            const item = node as NetworkNode;
            const active =
              !focusNodeId ||
              highlight.nodes.has(item.id) ||
              item.type === "hub" ||
              item.type === "brand";
            const color = networkNodeColor(item.type);
            return active ? color : `${color}33`;
          }}
          linkColor={(link) => {
            const source =
              typeof link.source === "object"
                ? (link.source as NetworkNode).id
                : String(link.source);
            const target =
              typeof link.target === "object"
                ? (link.target as NetworkNode).id
                : String(link.target);
            const active =
              !focusNodeId ||
              highlight.links.has(`${source}--${target}`) ||
              highlight.links.has(`${target}--${source}`);
            return active ? "rgba(196,181,253,0.45)" : "rgba(255,255,255,0.05)";
          }}
          linkWidth={(link) => {
            const source =
              typeof link.source === "object"
                ? (link.source as NetworkNode).id
                : String(link.source);
            const target =
              typeof link.target === "object"
                ? (link.target as NetworkNode).id
                : String(link.target);
            const active =
              !focusNodeId ||
              highlight.links.has(`${source}--${target}`) ||
              highlight.links.has(`${target}--${source}`);
            return active ? 1.4 : 0.6;
          }}
          linkDirectionalParticles={focusNodeId ? 2 : 0}
          linkDirectionalParticleWidth={2}
          cooldownTicks={120}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          onNodeClick={(node) => handleNodeClick(node as NetworkNode)}
          onNodeHover={(node) => setHoverNode((node as NetworkNode | null) ?? null)}
          onBackgroundClick={() => onSelectPersona?.(null)}
          onEngineStop={() => {
            const api = graphRef.current as {
              zoomToFit?: (ms?: number, padding?: number) => void;
            } | null;
            api?.zoomToFit?.(400, 70);
          }}
        />

        {hoverNode && (
          <div className="pointer-events-none absolute right-4 top-4 max-w-xs rounded-xl border border-white/10 bg-black/85 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">
              {hoverNode.type}
            </p>
            <p className="mt-1 text-sm font-medium text-white">{hoverNode.name}</p>
            {hoverNode.subtitle ? (
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {hoverNode.subtitle}
              </p>
            ) : null}
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] text-zinc-500">
          {network.nodes.length} notes · {network.links.length} links
        </div>
      </div>
    </div>
  );
}
