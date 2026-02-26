

"use client";

import { useState } from "react";

interface DigitalTwinProps {
  segmentRisks?: number[];
}

export default function DigitalTwin({ segmentRisks }: DigitalTwinProps) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  const getNodeColor = (risk?: number) => {
    if (risk === undefined) return "#9ca3af";
    if (risk < 40) return "#22c55e"; // green
    if (risk < 70) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const nodes = segmentRisks && segmentRisks.length >= 3
    ? segmentRisks
    : [30, 55, 80];

  return (
    <div className="bg-[#1f2937] p-4 rounded-md relative h-40 flex items-center justify-center">
      {/* Connections */}
      <div className="absolute w-32 h-[2px] bg-gray-600" />

      {/* Node 1 */}
      <div
        onClick={() => setSelectedNode(0)}
        className="w-4 h-4 rounded-full absolute left-6 cursor-pointer"
        style={{ backgroundColor: getNodeColor(nodes[0]) }}
      />

      {/* Node 2 */}
      <div
        onClick={() => setSelectedNode(1)}
        className="w-4 h-4 rounded-full cursor-pointer"
        style={{ backgroundColor: getNodeColor(nodes[1]) }}
      />

      {/* Node 3 */}
      <div
        onClick={() => setSelectedNode(2)}
        className="w-4 h-4 rounded-full absolute right-6 cursor-pointer"
        style={{ backgroundColor: getNodeColor(nodes[2]) }}
      />

      {/* Tooltip */}
      {selectedNode !== null && (
        <div className="absolute bottom-2 bg-black text-xs px-2 py-1 rounded-md border border-gray-700">
          Segment {selectedNode + 1} Risk: {nodes[selectedNode]}
        </div>
      )}
    </div>
  );
}