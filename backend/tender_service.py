

import osmnx as ox
import networkx as nx
from shapely.geometry import LineString
from shapely.ops import nearest_points


# -------------------------
# Fetch Active Road Construction Zones (OSM)
# -------------------------
def fetch_construction_zones():
    try:
        tags = {"highway": "construction"}
        gdf = ox.geometries_from_place("Chennai, Tamil Nadu, India", tags=tags)
        gdf = gdf[gdf.geometry.notnull()]
        return gdf
    except Exception:
        return None


# -------------------------
# Compute Tender Proximity Score
# -------------------------
def compute_tender_score(fiber_graph, construction_gdf):
    """
    Returns dictionary: {edge: normalized_proximity_score}
    Score closer to 1 = closer to construction
    """
    scores = {}

    if construction_gdf is None or construction_gdf.empty:
        # No construction found
        for edge in fiber_graph.edges():
            scores[str(edge)] = 0.0
        return scores

    for edge in fiber_graph.edges():
        node1 = fiber_graph.nodes[edge[0]]
        node2 = fiber_graph.nodes[edge[1]]

        lat1, lon1 = node1.get("lat", None), node1.get("lon", None)
        lat2, lon2 = node2.get("lat", None), node2.get("lon", None)

        if lat1 is None or lat2 is None:
            scores[str(edge)] = 0.0
            continue

        fiber_line = LineString([(lon1, lat1), (lon2, lat2)])

        min_dist = float("inf")
        for geom in construction_gdf.geometry:
            dist = fiber_line.distance(geom)
            if dist < min_dist:
                min_dist = dist

        # Normalize: assume 0–0.01 degrees (~1km) meaningful range
        norm_score = max(0, 1 - min_dist / 0.01)
        scores[str(edge)] = float(min(norm_score, 1.0))

    return scores