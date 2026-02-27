"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MapComponent = dynamic(
  () => import("../components/MapComponent"),
  { ssr: false }
);

interface RiskResponse {
  highest_risk_value: number;
  segments_detailed: any[];
}

export default function DashboardPage() {
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [now, setNow] = useState<string>("");
  const [riskHistory, setRiskHistory] = useState<number[]>([]);

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/risk");
        const data = await res.json();
        setRiskData(data);
        setRiskHistory((prev) => {
          const updated = [...prev, data.highest_risk_value * 100];
          return updated.slice(-20);
        });
      } catch (err) {
        console.error("Risk fetch failed:", err);
      }
    };

    fetchRisk();
    const interval = setInterval(fetchRisk, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setNow(new Date().toLocaleString());
  }, []);

  const overallRisk = (riskData?.highest_risk_value ?? 0) * 100;
  const segmentRisks =
    riskData?.segments_detailed?.map((s: any) => s.probability) ?? [];
  const segmentDetails = riskData?.segments_detailed ?? [];

  const sortedSegments = [...segmentDetails]
    .sort((a: any, b: any) => b.probability - a.probability);

  const topThree = sortedSegments.slice(0, 3);

  const riskColor =
    overallRisk > 70
      ? "text-red-400"
      : overallRisk > 40
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div className="min-h-screen w-screen bg-[#05070d] text-white flex flex-col">
      
      {/* TOP BAR */}
      <div className="h-16 bg-gradient-to-r from-[#0b1220] to-[#0f172a] border-b border-gray-800 flex items-center justify-between px-8 z-50">
        <div>
          <h1 className="text-lg font-bold tracking-widest">
            TANFIBER SHIELD
          </h1>
          <p className="text-xs text-gray-400">
            Statewide Fiber Intelligence Command Center
          </p>
        </div>

        <div className="flex items-center gap-8 text-sm">
          <span className="text-green-400 font-semibold">
            ● SYSTEM ONLINE
          </span>
          <span className="text-gray-400">
            AI AGENTS: 5/5 OPERATIONAL
          </span>
          <span className="text-gray-500">{now}</span>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 relative">

        {/* LEFT PANEL */}
        <div className="w-64 bg-[#0b1220] border-r border-gray-800 p-5 space-y-4">
          <h2 className="text-sm text-gray-400 tracking-wide">
            AI AGENT STATUS
          </h2>

          {[
            "Risk Prediction Agent",
            "Anomaly Detection Agent",
            "Impact Simulation Agent",
            "IVI Calculator",
            "Dispatch Optimization Agent",
          ].map((agent, i) => (
            <div
              key={i}
              className="bg-[#111827] p-3 rounded-lg border border-gray-700"
            >
              <p className="text-sm">{agent}</p>
              <p className="text-xs text-green-400 mt-1">
                Operational
              </p>
            </div>
          ))}
        </div>

        {/* MAP SECTION */}
        <div className="flex-1 relative">
          
          {/* FLOATING GLOBAL RISK BADGE */}
          <div className="absolute top-6 left-6 z-40 bg-[#0f172a]/80 backdrop-blur-md border border-gray-700 px-5 py-4 rounded-xl shadow-lg">
            <p className="text-xs text-gray-400">
              Infrastructure Risk
            </p>
            <p className={`text-3xl font-bold ${riskColor}`}>
              {overallRisk.toFixed(1)}%
            </p>
          </div>

          <MapComponent
            riskScore={overallRisk}
            segmentRisks={segmentRisks}
            segmentDetails={segmentDetails}
          />
        </div>

        {/* RIGHT PANEL */}
        <div className="w-72 bg-[#0b1220] border-l border-gray-800 p-5 space-y-6">
          <h2 className="text-sm text-gray-400 tracking-wide">
            RISK ANALYTICS
          </h2>

          <div className="bg-[#111827] p-4 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400">
              Overall Network Risk
            </p>
            <p className={`text-2xl font-bold ${riskColor}`}>
              {overallRisk.toFixed(1)}%
            </p>
          </div>

          <div className="bg-[#111827] p-4 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-2">
              Executive Insight
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              {overallRisk > 70
                ? "Critical escalation required. Dispatch teams immediately."
                : overallRisk > 40
                ? "Elevated stress detected. Monitor closely."
                : "Network stable. Maintain routine surveillance."}
            </p>
          </div>

          <div className="bg-[#111827] p-4 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-3">
              24H Risk Forecast
            </p>
            <div className="flex items-end gap-2 h-16">
              {[30, 40, 50, 60, 55, 45, 35].map((v, i) => (
                <div
                  key={i}
                  className="bg-orange-500 w-4 rounded-sm"
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>
          </div>

          {/* SEGMENT RISK RANKING */}
          <div className="bg-[#111827] p-4 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-3">
              Segment Risk Ranking
            </p>
            <div className="space-y-2">
              {sortedSegments.map((seg: any, i: number) => {
                const percent = (seg.probability * 100).toFixed(1);
                const barColor =
                  seg.probability > 0.7
                    ? "bg-red-500"
                    : seg.probability > 0.4
                    ? "bg-yellow-500"
                    : "bg-green-500";

                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-gray-300">
                      <span>{seg.id}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded">
                      <div
                        className={`${barColor} h-2 rounded`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TOP 3 CRITICAL SEGMENTS */}
          <div className="bg-[#111827] p-4 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-3">
              Top 3 Critical Segments
            </p>
            <div className="space-y-2">
              {topThree.map((seg: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between text-sm text-gray-300"
                >
                  <span>
                    {i + 1}. {seg.id}
                  </span>
                  <span className="text-red-400 font-semibold">
                    {(seg.probability * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* REAL-TIME RISK TREND */}
          <div className="bg-[#111827] p-4 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-3">
              Real-Time Risk Trend
            </p>
            <div className="flex items-end gap-1 h-16">
              {riskHistory.map((v, i) => (
                <div
                  key={i}
                  className="bg-cyan-400 w-2 rounded-sm"
                  style={{ height: `${Math.min(v, 100)}%` }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}