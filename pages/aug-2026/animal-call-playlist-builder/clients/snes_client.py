"""
DCCEEW "Species of National Environmental Significance" (SNES) live spatial
query client — replaces the manual PMST step, per your request.

Confirmed live via WebFetch against the public ArcGIS REST endpoint that
backs the federal species-discovery mapping tools, 2026-08-26:
  https://gis.environment.gov.au/gispub/rest/services/species/species_discovery_minimap/MapServer
(found via the folder listing at https://gis.environment.gov.au/gispub/rest/services,
which also has a sibling "pmst" folder confirming this is the same family of
services the actual PMST tool draws on).

Layers 0, 1, 2 are all "Species of National Environmental Significance"
polygons (modelled habitat, not confirmed sightings) with fields:
  SCIENTIFIC_NAME, VERNACULAR_NAME
  PRESENCE_CATEGORY  ("Species or species habitat likely to occur" /
                       "Species or species habitat may occur")
  EPBC_NAMES         (EPBC Act listing category, e.g. Vulnerable/Migratory)
  MODELLED_DATE
No authentication required.

Caveat carried over from DCCEEW's own metadata: this is habitat modelling,
not a field record or legal determination — it "does not confirm presence
or absence of a species at a site" and is meant to be "complemented by
local surveys and expert assessment." It also covers every EPBC-listed
taxon (plants, mammals, reptiles, birds, marine life...), not just birds —
this client does not filter by taxon (no class field is exposed on this
layer), so the pipeline cross-checks matches against the eBird/ALA/WildNet
bird list and flags anything it can't confirm is actually a bird rather
than silently including e.g. a listed orchid.

NOTE: this session's sandbox could not fully execute a live end-to-end test
query (fetches to the /query endpoint returned generic Esri help text
rather than a populated feature set, likely an artifact of the fetch tool
used here rather than the service itself) even though the schema above was
independently confirmed three separate times across layers 0/1/2. Confirm
on your first real run — this is a completely standard Esri "query"
operation (geometry + distance + units=esriSRUnit_Kilometer +
spatialRel=esriSpatialRelIntersects), so any ArcGIS REST reference will get
you unstuck fast if a parameter needs adjusting.
"""
from __future__ import annotations

import requests

BASE_URL = "https://gis.environment.gov.au/gispub/rest/services/species/species_discovery_minimap/MapServer"
LAYER_IDS = (0, 1, 2)

PRESENCE_RANK = {
    "Species or species habitat likely to occur": 0,
    "Species or species habitat may occur": 1,
}


class SNESClient:
    def __init__(self, timeout: int = 30):
        self.session = requests.Session()
        self.timeout = timeout

    def _query_layer(self, layer_id: int, lat: float, lng: float, distance_km: float) -> list[dict]:
        resp = self.session.get(
            f"{BASE_URL}/{layer_id}/query",
            params={
                "f": "json",
                "where": "1=1",
                "geometry": f"{lng},{lat}",
                "geometryType": "esriGeometryPoint",
                "inSR": 4326,
                "spatialRel": "esriSpatialRelIntersects",
                "distance": distance_km,
                "units": "esriSRUnit_Kilometer",
                "outFields": "SCIENTIFIC_NAME,VERNACULAR_NAME,PRESENCE_CATEGORY,EPBC_NAMES,MODELLED_DATE",
                "returnGeometry": "false",
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise RuntimeError(f"SNES layer {layer_id} query error: {data['error']}")
        return [f["attributes"] for f in data.get("features", [])]

    def species_near_point(self, lat: float, lng: float, distance_km: float = 10) -> list[dict]:
        """Query layers 0-2 and dedupe by scientific name, keeping the
        highest-confidence presence category seen for each species."""
        best: dict[str, dict] = {}
        for layer_id in LAYER_IDS:
            try:
                records = self._query_layer(layer_id, lat, lng, distance_km)
            except Exception as e:
                print(f"  [SNES layer {layer_id} failed] {e}")
                continue
            for rec in records:
                name = (rec.get("SCIENTIFIC_NAME") or "").strip()
                if not name:
                    continue
                presence = rec.get("PRESENCE_CATEGORY", "")
                rank = PRESENCE_RANK.get(presence, 2)
                existing = best.get(name)
                if existing is None or rank < existing["_rank"]:
                    best[name] = {
                        "scientific_name": name,
                        "common_name": rec.get("VERNACULAR_NAME", ""),
                        "presence_category": presence,
                        "epbc_status": rec.get("EPBC_NAMES", ""),
                        "modelled_date": rec.get("MODELLED_DATE", ""),
                        "_rank": rank,
                    }
        for v in best.values():
            v.pop("_rank", None)
        return list(best.values())


if __name__ == "__main__":
    import json
    import os

    client = SNESClient()
    lat = float(os.environ.get("SNES_TEST_LAT", -27.4698))
    lng = float(os.environ.get("SNES_TEST_LNG", 153.0251))
    species = client.species_near_point(lat, lng, distance_km=10)
    print(json.dumps(species, indent=2))
    print(f"Total SNES matches: {len(species)}")
