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
    if (!prob) return "#22c55e";
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
        const prob = detail?.probability || 0;
        const std = detail?.std || 0;

        const isCritical = prob > 0.75;
        const isUncertain = std > 0.08;

        return (
          <Polyline
            key={`fiber-${i}`}
            positions={[gpNodes[i], gpNodes[i + 1]]}
            pathOptions={{
              color: getSegmentColor(prob),
              weight: isCritical ? 8 : 6,
              opacity: 0.95,
              dashArray: isUncertain ? "6,4" : undefined
            }}
            className={isCritical ? "pulse-glow" : ""}
          >
            {detail && (
              <Tooltip direction="top" sticky>
                <div style={{
                  background: "rgba(17,24,39,0.85)",
                  backdropFilter: "blur(10px)",
                  padding: "12px",
                  borderRadius: "8px",
                  color: "white",
                  minWidth: "220px",
                  fontFamily: "monospace"
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                    {detail.id}
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "6px" }}>
                    IFI: {detail.ifi.toFixed(3)}
                  </div>
                  <div>Probability: {(detail.probability * 100).toFixed(1)}%</div>
                  <div>Uncertainty: ±{detail.std.toFixed(3)}</div>
                  <div>Impact: {detail.impact.toFixed(3)}</div>
                  <div style={{ marginTop: "6px", fontSize: "12px", opacity: 0.8 }}>
                    Rainfall: {(detail.rainfall_normalized || 0).toFixed(2)}<br/>
                    Construction: {(detail.construction_score || 0).toFixed(2)}<br/>
                    Centrality: {(detail.centrality || 0).toFixed(2)}
                  </div>
                </div>
              </Tooltip>
            )}
          </Polyline>
        );
      })}

      {/* GP Markers */}
      {gpNodes.map((point, index) => (
        <CircleMarker
          key={`gp-${index}`}
          center={point}
          radius={7}
          pathOptions={{
            color: "white",
            fillColor: "#2563eb",
            fillOpacity: 0.9,
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            GP {index + 1}
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Legend */}
      <Legend />
    </MapContainer>
  );
}

<style jsx global>{`
  .pulse-glow {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { filter: drop-shadow(0 0 4px rgba(239,68,68,0.6)); }
    50% { filter: drop-shadow(0 0 14px rgba(239,68,68,1)); }
    100% { filter: drop-shadow(0 0 4px rgba(239,68,68,0.6)); }
  }
`}</style>