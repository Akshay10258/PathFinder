"use client";

import { useMemo } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  type Node, type Edge, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import clsx from "clsx";
import { formatTopic, masteryColor } from "@/lib/format";
import { PREREQUISITES, computeLevels } from "@/lib/conceptGraph";

const COL_WIDTH = 210;
const ROW_HEIGHT = 72;

type MasteryNodeData = { label: string; mastery: number };

function MasteryNodeCard({ data }: NodeProps<Node<MasteryNodeData>>) {
  const mc = masteryColor(data.mastery);
  return (
    <div className={clsx("px-3 py-2 rounded-lg border text-xs w-[172px]", mc.bg, mc.border)}>
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-1.5 !h-1.5 !border-0" />
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-200 truncate">{data.label}</span>
        <span className={clsx("text-[10px] font-mono font-bold shrink-0", mc.text)}>{data.mastery.toFixed(2)}</span>
      </div>
      <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden mt-1.5">
        <div className={clsx("h-full rounded-full", mc.bar)} style={{ width: `${data.mastery * 100}%` }} />
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

const nodeTypes = { masteryNode: MasteryNodeCard };

/** The full 34-topic prerequisite DAG (concept_graph.py's PREREQUISITES),
 * each node colored by this student's live SAKT mastery — the "curriculum
 * constellation" view: not a flat list, the actual structure the Adaptive
 * Roadmap reasons over, with your own progress overlaid on it. */
export default function MasteryGraph({ scores }: { scores: Record<string, number> }) {
  const { nodes, edges } = useMemo(() => {
    const allIds = Object.keys(scores);
    const idSet = new Set(allIds);

    const rfEdges: { source: string; target: string }[] = [];
    for (const topic of allIds) {
      for (const prereq of PREREQUISITES[topic] || []) {
        if (idSet.has(prereq)) rfEdges.push({ source: prereq, target: topic });
      }
    }

    const levels = computeLevels(allIds, rfEdges);
    const perLevelCount: Record<number, number> = {};

    const rfNodes: Node<MasteryNodeData>[] = allIds.map((topic) => {
      const lvl = levels[topic];
      const row = perLevelCount[lvl] ?? 0;
      perLevelCount[lvl] = row + 1;
      return {
        id: topic,
        type: "masteryNode",
        position: { x: lvl * COL_WIDTH, y: row * ROW_HEIGHT },
        data: { label: formatTopic(topic), mastery: scores[topic] ?? 0 },
        draggable: false,
      };
    });

    const rfFinalEdges: Edge[] = rfEdges.map((e) => {
      const sourceMastery = scores[e.source] ?? 0;
      const color = sourceMastery < 0.4 ? "#fb7185" : sourceMastery < 0.7 ? "#fbbf24" : "#34d399";
      return {
        id: `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        style: { stroke: color, strokeWidth: 1.25, opacity: 0.5 },
      };
    });

    return { nodes: rfNodes, edges: rfFinalEdges };
  }, [scores]);

  return (
    <div className="h-[600px] w-full rounded-2xl border border-white/10 overflow-hidden bg-[#0d0d12]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        minZoom={0.3}
      >
        <Background color="#ffffff" gap={20} size={1} style={{ opacity: 0.04 }} />
        <Controls showInteractive={false} className="!bg-[#16161e] !border-white/10 [&>button]:!bg-[#16161e] [&>button]:!border-white/10 [&>button]:!text-slate-300" />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(10,10,10,0.7)"
          className="!bg-[#111116] !border !border-white/10"
          nodeColor={(n) => {
            const m = (n.data as unknown as MasteryNodeData).mastery;
            return m < 0.4 ? "#fb7185" : m < 0.7 ? "#fbbf24" : "#34d399";
          }}
        />
      </ReactFlow>
    </div>
  );
}
