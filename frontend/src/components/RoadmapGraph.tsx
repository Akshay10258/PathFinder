"use client";

import { useMemo } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  type Node, type Edge, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CheckCircle2, Clock } from "lucide-react";
import clsx from "clsx";
import type { RoadmapStep } from "@/lib/types";
import { formatTopic } from "@/lib/format";
import { PREREQUISITES, computeLevels } from "@/lib/conceptGraph";

const COL_WIDTH = 230;
const ROW_HEIGHT = 88;

type RoadmapNodeData = {
  label: string;
  stepNumber: number | null;
  timeEstimate: number | null;
  status: "mastered" | "plan";
};

function RoadmapNodeCard({ data }: NodeProps<Node<RoadmapNodeData>>) {
  const isMastered = data.status === "mastered";
  return (
    <div
      className={clsx(
        "px-3 py-2.5 rounded-xl border text-xs w-[200px] shadow-lg",
        isMastered ? "bg-emerald-500/10 border-emerald-500/30" : "bg-[#16161e] border-indigo-500/40"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-1.5 mb-1">
        {isMastered ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <span className="w-4 h-4 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center shrink-0">
            {data.stepNumber}
          </span>
        )}
        <span className={clsx("font-semibold truncate", isMastered ? "text-emerald-300" : "text-slate-100")}>
          {data.label}
        </span>
      </div>
      {isMastered ? (
        <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider">Already mastered</div>
      ) : (
        data.timeEstimate != null && (
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> {data.timeEstimate}h
          </div>
        )
      )}
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2 !h-2 !border-0" />
    </div>
  );
}

const nodeTypes = { roadmapNode: RoadmapNodeCard };

export default function RoadmapGraph({
  steps, masteredTopics,
}: { steps: RoadmapStep[]; masteredTopics: string[] }) {
  const { nodes, edges } = useMemo(() => {
    const planTopics = Array.from(new Set(steps.map((s) => s.topic)));
    const masteredSet = new Set(masteredTopics);

    // Only surface mastered topics that directly unlock something in this
    // plan — otherwise all 34 topics could flood the graph with context
    // nobody asked to see.
    const relevantMastered = new Set<string>();
    for (const topic of planTopics) {
      for (const prereq of PREREQUISITES[topic] || []) {
        if (masteredSet.has(prereq)) relevantMastered.add(prereq);
      }
    }

    const allIds = [...planTopics, ...relevantMastered];
    const idSet = new Set(allIds);

    const rfEdges: { source: string; target: string }[] = [];
    for (const topic of allIds) {
      for (const prereq of PREREQUISITES[topic] || []) {
        if (idSet.has(prereq)) rfEdges.push({ source: prereq, target: topic });
      }
    }

    const levels = computeLevels(allIds, rfEdges);
    const perLevelCount: Record<number, number> = {};

    const firstStepByTopic = new Map<string, RoadmapStep>();
    for (const s of steps) if (!firstStepByTopic.has(s.topic)) firstStepByTopic.set(s.topic, s);

    const rfNodes: Node<RoadmapNodeData>[] = allIds.map((topic) => {
      const lvl = levels[topic];
      const row = perLevelCount[lvl] ?? 0;
      perLevelCount[lvl] = row + 1;
      const isMastered = relevantMastered.has(topic);
      const step = firstStepByTopic.get(topic);

      return {
        id: topic,
        type: "roadmapNode",
        position: { x: lvl * COL_WIDTH, y: row * ROW_HEIGHT },
        data: {
          label: formatTopic(topic),
          stepNumber: step?.step ?? null,
          timeEstimate: step?.time_estimate_hours ?? null,
          status: isMastered ? "mastered" : "plan",
        },
        draggable: false,
      };
    });

    const rfFinalEdges: Edge[] = rfEdges.map((e) => ({
      id: `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: relevantMastered.has(e.source) ? "#34d399" : "#818cf8", strokeWidth: 1.5, opacity: 0.6 },
    }));

    return { nodes: rfNodes, edges: rfFinalEdges };
  }, [steps, masteredTopics]);

  return (
    <div className="h-[520px] w-full rounded-2xl border border-white/10 overflow-hidden bg-[#0d0d12]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll={false}
      >
        <Background color="#ffffff" gap={20} size={1} style={{ opacity: 0.04 }} />
        <Controls showInteractive={false} className="!bg-[#16161e] !border-white/10 [&>button]:!bg-[#16161e] [&>button]:!border-white/10 [&>button]:!text-slate-300" />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(10,10,10,0.7)"
          className="!bg-[#111116] !border !border-white/10"
          nodeColor={(n) => ((n.data as unknown as RoadmapNodeData).status === "mastered" ? "#34d399" : "#6366f1")}
        />
      </ReactFlow>
    </div>
  );
}
