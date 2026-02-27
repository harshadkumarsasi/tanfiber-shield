"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("../components/MapComponent"), {
  ssr: false,
});

import DigitalTwin from "../components/DigitalTwin";

export default function Home() {
  const [riskData, setRiskData] = useState<any>(null);
  const [displayIvi, setDisplayIvi] = useState<number>(0);
  const [simulationMode, setSimulationMode] = useState(false);

  const [currentTime, setCurrentTime] = useState<string>("");
  const [executiveInsight, setExecutiveInsight] = useState<string>("");
  useEffect(() => {
    if (!riskData) return;

    const segmentsDetailed = riskData.segments_detailed || [];

    if (!segmentsDetailed.length) return;

    let maxIFI = 0;
    let worstSegment = "";

    segmentsDetailed.forEach((segment: any) => {
      if (segment.ifi > maxIFI) {
        maxIFI = segment.ifi;
        worstSegment = segment.id;
      }
    });

    const tone = maxIFI > 0.6 ? "critical" : maxIFI > 0.3 ? "elevated" : "stable";

    const insight = `AI Analysis: Segment ${worstSegment} exhibits the highest Infrastructure Fragility Index (IFI=${maxIFI.toFixed(2)}). System condition is ${tone}. Recommend preventive inspection before redundancy degradation.`;

    setExecutiveInsight(insight);
  }, [riskData]);

  useEffect(() => {
    if (!riskData) return;

    const segmentMeans = (riskData.segments_detailed || []).map((s: any) => s.probability);
    const target = segmentMeans.length
      ? segmentMeans.reduce((a: number, b: number) => a + b, 0) / segmentMeans.length
      : 0;
    let current = displayIvi;

    const step = (target - current) / 20;

    const interval = setInterval(() => {
      current += step;
      if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
        current = target;
        clearInterval(interval);
      }
      setDisplayIvi(Number(current.toFixed(1)));
    }, 40);

    return () => clearInterval(interval);
  }, [riskData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchRisk = () => {
      fetch("http://127.0.0.1:8000/risk")
        .then((res) => res.json())
        .then((data) => {
          if (simulationMode) {
            data.ivi_score = Number(
              Math.min(95, data.ivi_score + Math.random() * 15).toFixed(1)
            );
            data.risk_level = data.ivi_score > 70 ? "High" : data.ivi_score > 40 ? "Medium" : "Low";
          }
          setRiskData(data);
        })
        .catch((err) => console.error(err));
    };

    fetchRisk();
    const interval = setInterval(fetchRisk, 5000);

    return () => clearInterval(interval);
  }, [simulationMode]);

  return (
    <div className="min-h-screen bg-[#0b1120] text-white flex flex-col">

      {/* Top Navbar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-bold tracking-wide">
            TANFIBER SHIELD
          </h1>
          <p className="text-xs text-gray-400">
            Infrastructure Intelligence Platform
          </p>
          <p className="text-xs text-blue-400 mt-1">
            Active District: {riskData?.district || "Loading..."}
          </p>
        </div>

        <div className="flex gap-6 text-sm text-gray-300">
          <span className={displayIvi > 0.7 ? "text-red-400" : "text-green-400"}>
            {displayIvi > 0.7 ? "⚠ Threat Escalated" : "● System Online"}
          </span>
          <span>AI Agents: 5/5 Operational</span>
          <span>{currentTime}</span>
        </div>
      </div>

      <div className="flex flex-1">

        {/* Left Panel */}
        <div className="w-64 bg-[#111827] border-r border-gray-800 p-4">
          <h2 className="text-sm text-gray-400 mb-4">
            AI AGENT STATUS
          </h2>

          {[
            "Risk Prediction Agent",
            "Anomaly Detection Agent",
            "Impact Simulation Agent",
            "IVI Calculator",
            "Dispatch Optimization Agent"
          ].map((agent, index) => (
            <div key={index} className="mb-3 p-3 bg-[#1f2937] rounded-md">
              <p className="text-sm">{agent}</p>
              <p className="text-xs text-green-400">Operational</p>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="flex-1">
          <MapComponent
            riskScore={displayIvi}
            segmentRisks={(riskData?.segments_detailed || []).map((s: any) => s.probability)}
            segmentDetails={riskData?.segments_detailed || []}
          />
        </div>

        {/* Right Panel */}
        <div className="w-80 bg-[#111827] border-l border-gray-800 p-4">
          <h2 className="text-sm text-gray-400 mb-4">
            INFRASTRUCTURE VULNERABILITY INDEX
          </h2>

          <div className={`p-4 rounded-md transition-all duration-300 ${
            displayIvi > 0.7
              ? "bg-red-900/40 border border-red-500"
              : displayIvi > 0.4
              ? "bg-yellow-900/40 border border-yellow-500"
              : "bg-[#1f2937]"
          }`}>
            <p className="text-4xl font-bold text-orange-400">
              {riskData ? displayIvi.toFixed(1) : "..."}
            </p>
            <p className="text-sm text-gray-400">
              {riskData ? `District: ${riskData.district}` : "Loading..."}
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-sm text-gray-400 mb-2">
              Risk Prediction
            </h3>
            <p className="text-sm">
              Highest Segment Risk: {riskData ? riskData.highest_risk_value?.toFixed(2) : "..."}
            </p>
            <div className="mt-6">
              <button
                onClick={() => setSimulationMode(!simulationMode)}
                className="w-full bg-blue-600 hover:bg-blue-700 transition p-2 rounded-md text-sm"
              >
                {simulationMode ? "Stop Simulation" : "Run Simulation"}
              </button>
            </div>
          </div>

          {/* Executive AI Insight */}
          <div className="mt-8">
            <h3 className="text-sm text-gray-400 mb-2">
              Executive AI Insight
            </h3>
            <div className="bg-[#1f2937] p-4 rounded-md text-sm text-gray-300 leading-relaxed">
              {executiveInsight || "Generating AI intelligence summary..."}
            </div>
          </div>

          {/* Risk Forecast Timeline */}
          <div className="mt-8">
            <h3 className="text-sm text-gray-400 mb-2">
              24H Risk Forecast
            </h3>
            <div className="bg-[#1f2937] p-4 rounded-md h-24 flex items-end gap-2">
              {[30, 45, 55, 65, 75, 60, 50].map((val, i) => (
                <div
                  key={i}
                  className="flex-1 bg-orange-500"
                  style={{ height: `${val}%` }}
                />
              ))}
            </div>
          </div>

          {/* Digital Twin Network View */}
          <div className="mt-8">
            <h3 className="text-sm text-gray-400 mb-2">
              Digital Twin (Network Graph)
            </h3>
            <DigitalTwin segmentRisks={(riskData?.segments_detailed || []).map((s: any) => s.probability)} />
          </div>
        </div>

      </div>
    </div>
  );
}