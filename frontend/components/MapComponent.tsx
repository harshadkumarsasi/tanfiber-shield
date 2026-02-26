"use client";

import React from "react";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet.heat";

// Primary backbone route
const fiberRouteA: LatLngExpression[] = [
  [13.0827, 80.2707],
  [13.0674, 80.2376],
  [13.0475, 80.2121],
  [13.0358, 80.1982],
];

// Secondary distribution route
const fiberRouteB: LatLngExpression[] = [
  [13.0827, 80.2707],
  [13.095, 80.255],
  [13.11, 80.24],
];

// Operational zones
const zones = [
  { name: "Zone Alpha", coords: [13.0827, 80.2707] },
  { name: "Zone Beta", coords: [13.0475, 80.2121] },
  { name: "Zone Gamma", coords: [13.11, 80.24] },
];

// Simulated dense anomaly incidents
const incidentPoints: LatLngExpression[] = Array.from({ length: 60 }).map(() => [
  13.03 + Math.random() * 0.12,
  80.18 + Math.random() * 0.12,
]);

interface MapProps {
  riskScore?: number;
  segmentRisks?: number[];
}

function HeatLayer({ segmentRisks }: { segmentRisks?: number[] }) {
  const map = useMap();

  useEffect(() => {
    if (!segmentRisks) return;

    const heatData = fiberRouteA.slice(0, -1).map((point, i) => [
      (point as number[])[0],
      (point as number[])[1],
      (segmentRisks[i] || 30) / 80,
    ]);

    const heatLayer = L.heatLayer(heatData, {
      radius: 40,
      blur: 30,
      maxZoom: 17,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [segmentRisks, map]);

  return null;
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

export default function MapComponent({ riskScore, segmentRisks }: MapProps) {
  const getSegmentColor = (risk?: number) => {
    if (!risk) return "#22c55e";
    if (risk < 40) return "#22c55e";
    if (risk < 70) return "#f97316";
    return "#ef4444";
  };

  const highThreat = segmentRisks?.some((r) => r > 75);

  const [dashOffset, setDashOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDashOffset((prev) => (prev + 1) % 20);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Generate network-style connections between random incidents
  const connectionLines = incidentPoints.slice(0, 25).map((point, i) => {
    const next = incidentPoints[(i + 3) % incidentPoints.length];
    return [point, next];
  });

  return (
    <MapContainer
      center={[13.0827, 80.2707]}
      zoom={12}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Backbone Route A */}
      {fiberRouteA.slice(0, -1).map((_, i) => (
        <Polyline
          key={`A-${i}`}
          positions={[fiberRouteA[i], fiberRouteA[i + 1]]}
          pathOptions={{
            color: getSegmentColor(segmentRisks?.[i]),
            weight: 8,
            opacity: 0.95,
            dashArray: "10,10",
            dashOffset: `${dashOffset}`,
          }}
        />
      ))}

      {/* Distribution Route B */}
      {fiberRouteB.slice(0, -1).map((_, i) => (
        <Polyline
          key={`B-${i}`}
          positions={[fiberRouteB[i], fiberRouteB[i + 1]]}
          pathOptions={{
            color: "#3b82f6",
            weight: 4,
            dashArray: "5,5",
          }}
        />
      ))}

      {/* Operational Zones */}
      {zones.map((zone, index) => (
        <CircleMarker
          key={index}
          center={zone.coords as LatLngExpression}
          radius={6}
          pathOptions={{ color: "white", fillColor: "#6366f1", fillOpacity: 0.8 }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            {zone.name}
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Dense Incident Markers */}
      {incidentPoints.map((point, index) => (
        <React.Fragment key={`incident-group-${index}`}>
          {/* Outer glow */}
          <CircleMarker
            center={point}
            radius={12}
            pathOptions={{
              color: "#f59e0b",
              fillColor: "#f59e0b",
              fillOpacity: 0.15,
            }}
          />
          {/* Core point */}
          <CircleMarker
            center={point}
            radius={5}
            pathOptions={{
              color: "#f59e0b",
              fillColor: "#f59e0b",
              fillOpacity: 0.9,
            }}
          />
        </React.Fragment>
      ))}

      {/* Network Graph Connections */}
      {connectionLines.map((line, idx) => (
        <Polyline
          key={`connection-${idx}`}
          positions={line as LatLngExpression[]}
          pathOptions={{
            color: "#38bdf8",
            weight: 1.5,
            opacity: 0.4,
          }}
        />
      ))}

      {/* Animated Critical Pulse */}
      {highThreat && (
        <CircleMarker
          center={fiberRouteA[1]}
          radius={60}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.1,
          }}
        />
      )}

      {/* Heatmap */}
      <HeatLayer segmentRisks={segmentRisks} />

      {/* Legend */}
      <Legend />
    </MapContainer>
  );
}