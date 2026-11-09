import csv
from collections import defaultdict
# from pathlib import Path

from remotezip import RemoteZip

# Downloads the GTFS zip from the remote url and extracts the static files used by the backend.
# Input:  statics_path - directory the extracted files are written to.
#        gtfs_url - remote url of the GTFS zip archive.
# Output: None - extracts trips.txt, shapes.txt, and routes.txt into statics_path.

def load_static_data(statics_path: str, gtfs_url: str):

    with RemoteZip(gtfs_url, timeout = 10) as z:

        z.extract("trips.txt", path=statics_path)
        z.extract("shapes.txt", path=statics_path)
        z.extract("routes.txt", path=statics_path)

# Builds a GeoJSON FeatureCollection of route polylines (LineStrings) for the given tracked routes.
# Input:  statics_path - directory that contains trips.txt and shapes.txt.
#        rids - set of tracked route ids to build the line shapes for.
# Output: dict - GeoJSON FeatureCollection where each feature is a LineString of [lng, lat] coordinates.

def load_route_shapes(statics_path: str, rids: frozenset[int]):
    sid_to_rid = dict()
    with open(statics_path + "/trips.txt", newline='', encoding="utf-8-sig", mode='r') as csvfile:
        for row in csv.DictReader(csvfile):
            if int(row["route_id"]) in rids and row.get("shape_id"):
                sid_to_rid[int(row["shape_id"])] = row["route_id"]

    points_per_sid = defaultdict(list)
    with open(statics_path + "/shapes.txt", newline="", encoding="utf-8-sig", mode='r') as csvfile:
        for row in csv.DictReader(csvfile):
            sid = int(row["shape_id"])
            if sid in sid_to_rid:
                points_per_sid[sid].append(
                    (int(row["shape_pt_sequence"]),
                    float(row["shape_pt_lon"]),
                    float(row["shape_pt_lat"]))
                )

    features = []
    for sid, pts in points_per_sid.items():
        pts.sort()  # order by shape_pt_sequence
        features.append({
            "type": "Feature",
            "properties": {"route_id": sid_to_rid[sid], "shape_id": sid},
            "geometry": {
                "type": "LineString",
                "coordinates": [[lon, lat] for _, lon, lat in pts],  # GeoJSON is [lng, lat]
            },
        })
    return {"type": "FeatureCollection", "features": features}


# Reads routes.txt and builds a mapping of all route ids to display names.
# Input:  statics_path - directory that contains routes.txt.
# Output: dict[int, str] - mapping of route id to a display name (route_long_name, falling back to route_desc).

def get_all_route_ids(statics_path: str):
    rids = set()
    route_names: dict[int, str] = {}
    with open(statics_path + "/routes.txt", newline='', encoding="utf-8-sig", mode='r') as csvfile:
        for row in csv.DictReader(csvfile):
            rid = int(row["route_id"])
            if rid not in rids:
                rids.add(rid)
                route_name = str(row["route_long_name"])
                if route_name == "" or route_name == " ":
                    route_name =str(row["route_desc"])
                route_names[rid] = route_name

    return route_names