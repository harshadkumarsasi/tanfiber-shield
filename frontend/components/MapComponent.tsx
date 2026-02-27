"use client";

import React from "react";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet.heat";

// Real Kanchipuram GP Coordinates
const gpNodes: LatLngExpression[] = [
  [12.7641, 79.8353], // Angambakkam
  [12.8862, 79.6544], // Ariyaperumbakkam
  [12.8151, 79.7479], // Asoor
  [12.7834, 79.8001], // Avalur
  [12.7843, 79.6628], // Ayyangarkulam
  [12.8866, 79.5927], // Damal
  [12.7201, 79.7989], // Elayanarvelur
  [12.7677, 79.7335], // Kalakattur
  [12.7579, 79.7484], // Kalur
];

const villageNames = [
  "Angambakkam",
  "Ariyaperumbakkam",
  "Asoor",
  "Avalur",
  "Ayyangarkulam",
  "Damal",
  "Elayanarvelur",
  "Kalakattur",
  "Kalur",
];

interface SegmentDetail {
  id: string;
  probability: number;
  std: number;
  impact: number;
  ifi: number;
  rainfall_normalized?: number;
  construction_score?: number;
  centrality?: number;
}

interface MapProps {
  riskScore?: number;
  segmentRisks?: number[];
  segmentDetails?: SegmentDetail[];
}

function Legend() {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: "bottomright" });

    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "info legend");
      div.style.background = "#111827";
      div.style.padding = "10px";
      div.style.borderRadius = "8px";
      div.style.color = "white";
      div.innerHTML = `
        <strong>Risk Levels</strong><br/>
        <span style="color:#22c55e">■</span> Low<br/>
        <span style="color:#f97316">■</span> Elevated<br/>
        <span style="color:#ef4444">■</span> Critical
      `;
      return div;
    };

    legend.addTo(map);

    return () => {
      map.removeControl(legend);
    };
  }, [map]);

  return null;
}

export default function MapComponent({ riskScore, segmentRisks, segmentDetails }: MapProps) {
  const getSegmentColor = (prob?: number) => {
    if (prob === undefined) return "#22c55e";
    if (prob < 0.4) return "#22c55e";
    if (prob < 0.75) return "#f97316";
    return "#ef4444";
  };

  const [dashOffset, setDashOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDashOffset((prev) => (prev + 1) % 20);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer
      center={[12.8342, 79.7036]}
      zoom={12}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Fiber Route Between GPs */}
      {gpNodes.slice(0, -1).map((_, i) => {
        const detail = segmentDetails?.[i];
        const prob = detail?.probability ?? 0;
        const std = detail?.std ?? 0;

        const isCritical = prob > 0.75;
        const isUncertain = std > 0.08;

        return (
          <React.Fragment key={`fiber-${i}`}>
            <Polyline
              positions={[gpNodes[i], gpNodes[i + 1]]}
              pathOptions={{
                color: getSegmentColor(prob),
                weight: isCritical ? 14 : 10,
                opacity: 0.15,
                dashArray: isUncertain ? "2,6" : undefined,
                interactive: true,
              }}
            />
            <Polyline
              positions={[gpNodes[i], gpNodes[i + 1]]}
              pathOptions={{
                color: getSegmentColor(prob),
                weight: isCritical ? 8 : 6,
                opacity: 1,
                dashArray: "6,10",
                dashOffset: dashOffset.toString(),
                interactive: true,
              }}
              className={isCritical ? "pulse-glow" : ""}
            >
              {detail && (
                <Tooltip direction="top" sticky>
                  <div style={{
                    background: "rgba(15,23,42,0.75)",
                    backdropFilter: "blur(18px)",
                    padding: "16px",
                    borderRadius: "12px",
                    color: "white",
                    minWidth: "260px",
                    fontFamily: "monospace",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 0 25px rgba(0,0,0,0.6)"
                  }}>

                    <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "13px", letterSpacing: "1px" }}>
                      {detail.id}
                    </div>

                    <div style={{ fontSize: "26px", fontWeight: "bold", marginBottom: "10px", color: detail.ifi > 0.7 ? "#ef4444" : "#22c55e" }}>
                      IFI {detail.ifi.toFixed(3)}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "12px" }}>
                      <div>Probability</div>
                      <div style={{ textAlign: "right" }}>{(detail.probability * 100).toFixed(1)}%</div>

                      <div>Uncertainty</div>
                      <div style={{ textAlign: "right" }}>±{detail.std.toFixed(3)}</div>

                      <div>Impact</div>
                      <div style={{ textAlign: "right" }}>{detail.impact.toFixed(3)}</div>
                    </div>

                    <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px", fontSize: "11px", opacity: 0.85 }}>
                      <div>Rainfall Index: {(detail.rainfall_normalized || 0).toFixed(2)}</div>
                      <div>Construction Index: {(detail.construction_score || 0).toFixed(2)}</div>
                      <div>Centrality: {(detail.centrality || 0).toFixed(2)}</div>
                    </div>

                  </div>
                </Tooltip>
              )}
            </Polyline>
          </React.Fragment>
        );
      })}

      {/* GP Markers */}
      {gpNodes.map((point, index) => {
        const isAggregation = index === 0;

        return (
          <CircleMarker
            key={`gp-${index}`}
            center={point}
            radius={isAggregation ? 12 : 6}
            pathOptions={{
              color: "white",
              fillColor: isAggregation ? "#9333ea" : "#2563eb",
              fillOpacity: 0.9,
              weight: isAggregation ? 3 : 1
            }}
            className="node-glow"
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              {isAggregation
                ? `Aggregation Node — ${villageNames[index]}`
                : villageNames[index]}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Legend */}
      <Legend />
    </MapContainer>
  );
}

<style jsx global>{`
  .pulse-glow {
    animation: pulseCritical 1.8s infinite ease-in-out;
  }

  @keyframes pulseCritical {
    0% { filter: drop-shadow(0 0 6px rgba(239,68,68,0.6)); }
    50% { filter: drop-shadow(0 0 22px rgba(239,68,68,1)); }
    100% { filter: drop-shadow(0 0 6px rgba(239,68,68,0.6)); }
  }

  .node-glow path {
    filter: drop-shadow(0 0 6px rgba(59,130,246,0.8));
  }
`}</style>