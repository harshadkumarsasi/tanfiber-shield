from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import osmnx as ox
import networkx as nx
import numpy as np
import requests
from tender_service import fetch_construction_zones, compute_tender_score


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache
G = None
fiber_graph = None
centrality = None
segment_risks = {}
impact_scores = {}
rain_value_global = 0.0
tender_scores_global = {}


def logistic(x):
    return 1 / (1 + np.exp(-x))


@app.on_event("startup")
def build_model():
    global G, fiber_graph, centrality, segment_risks, impact_scores, rain_value_global, tender_scores_global

    print("Initializing PFRI model...")

    # -------------------------
    # 1️⃣ Load Road Graph
    # -------------------------
    G = ox.graph_from_place("Kanchipuram district, Tamil Nadu, India", network_type="drive")

    # -------------------------
    # 2️⃣ Hardcoded Real GP Coordinates (Kanchipuram)
    # -------------------------
    print("Loading hardcoded Kanchipuram GP coordinates...")

    nodes = {
        "GP_1": (12.7641, 79.8353),  # Angambakkam
        "GP_2": (12.8862, 79.6544),  # Ariyaperumbakkam
        "GP_3": (12.8151, 79.7479),  # Asoor
        "GP_4": (12.7834, 79.8001),  # Avalur
        "GP_5": (12.7843, 79.6628),  # Ayyangarkulam
        "GP_6": (12.8866, 79.5927),  # Damal
        "GP_7": (12.7201, 79.7989),  # Elayanarvelur
        "GP_8": (12.7677, 79.7335),  # Kalakattur
        "GP_9": (12.7579, 79.7484),  # Kalur
    }

    # -------------------------
    # 3️⃣ Build Fiber Graph
    # -------------------------
    fiber_graph = nx.Graph()

    for name, coord in nodes.items():
        nearest = ox.distance.nearest_nodes(G, coord[1], coord[0])
        fiber_graph.add_node(
            name,
            osmid=nearest,
            lat=coord[0],
            lon=coord[1]
        )

    node_list = list(nodes.keys())
    node_list = sorted(node_list)

    for i in range(len(node_list) - 1):
        src = fiber_graph.nodes[node_list[i]]["osmid"]
        dst = fiber_graph.nodes[node_list[i+1]]["osmid"]

        length = nx.shortest_path_length(G, src, dst, weight="length")
        fiber_graph.add_edge(node_list[i], node_list[i+1], length=length)

    # -------------------------
    # 4️⃣ Edge Centrality
    # -------------------------
    centrality = nx.edge_betweenness_centrality(fiber_graph)

    # -------------------------
    # 5️⃣ Fetch Construction Zones + Tender Scores
    # -------------------------
    print("Fetching construction zones...")
    construction_gdf = fetch_construction_zones()
    tender_scores = compute_tender_score(fiber_graph, construction_gdf)
    tender_scores_global = tender_scores

    # -------------------------
    # 6️⃣ Live Rainfall
    # -------------------------
    print("Fetching live rainfall...")
    rain_value = 0.0
    try:
        lat, lon = 13.0827, 80.2707
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=precipitation"
        response = requests.get(url, timeout=5)
        data = response.json()
        rain_value = data.get("current", {}).get("precipitation", 0.0)
        rain_value = min(rain_value / 50.0, 1.0)
    except Exception:
        rain_value = 0.0
    rain_value_global = rain_value

    # -------------------------
    # 7️⃣ Risk + Monte Carlo
    # -------------------------
    segment_risks = {}

    for edge in fiber_graph.edges():
        tender = tender_scores.get(str(edge), 0.0)
        central = centrality.get(edge, 0.1)

        samples = []
        for _ in range(100):
            r = np.random.normal(rain_value, 0.05)
            t = np.random.normal(tender, 0.05)
            c = np.random.normal(central, 0.02)
            score = logistic(2*r + 1.5*t + 3*c)
            samples.append(score)

        mean_risk = float(np.mean(samples))
        std_risk = float(np.std(samples))

        segment_risks[str(edge)] = {
            "mean": mean_risk,
            "std": std_risk
        }

    # -------------------------
    # 8️⃣ Blast Radius
    # -------------------------
    impact_scores = {}

    for edge in list(fiber_graph.edges()):
        temp_graph = fiber_graph.copy()
        temp_graph.remove_edge(*edge)

        components = list(nx.connected_components(temp_graph))
        largest = max(len(c) for c in components)
        impact = 1 - (largest / len(temp_graph.nodes()))

        impact_scores[str(edge)] = impact

    print("PFRI model ready.")


@app.get("/")
def root():
    return {"status": "PFRI Backend Running"}


@app.get("/risk")
def get_risk():
    if not segment_risks:
        return {"error": "Model not initialized properly"}

    max_segment = max(segment_risks, key=lambda e: segment_risks[e]["mean"])

    # Build detailed intelligence objects per segment
    segment_detailed = []

    for edge_key, risk_data in segment_risks.items():
        mean_prob = float(risk_data["mean"])
        std_prob = float(risk_data["std"])
        impact = float(impact_scores.get(edge_key, 0.0))
        ifi = mean_prob * impact

        # Edge is stored as string like "('GP_1', 'GP_2')"
        try:
            edge_tuple = eval(edge_key)
            segment_id = f"{edge_tuple[0]} ↔ {edge_tuple[1]}"
        except Exception:
            segment_id = edge_key

        segment_detailed.append({
            "id": segment_id,
            "probability": mean_prob,
            "std": std_prob,
            "impact": impact,
            "ifi": ifi,
            "rainfall_normalized": float(rain_value_global),
            "construction_score": float(tender_scores_global.get(edge_key, 0.0)),
            "centrality": float(centrality.get(eval(edge_key), 0.0)) if edge_key in segment_risks else 0.0
        })

    return {
        "district": "Kanchipuram",
        "segments": segment_risks,  # keep old structure (no breaking change)
        "segments_detailed": segment_detailed,  # new intelligence layer
        "impact_scores": impact_scores,
        "highest_risk_segment": max_segment,
        "highest_risk_value": segment_risks[max_segment]["mean"],
        "live_rainfall_normalized": rain_value_global,
        "tender_proximity_scores": tender_scores_global
    }