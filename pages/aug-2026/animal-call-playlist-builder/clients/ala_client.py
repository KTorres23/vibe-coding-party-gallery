"""
Atlas of Living Australia (ALA) biocache client.

Contract per ALA's documented occurrence-search web service (docs.ala.org.au)
and long-standing public usage patterns of biocache-ws.ala.org.au.

NOT executed live in this session: WebFetch to this endpoint was refused with
ROBOTS_DISALLOWED by the fetch tool (that restriction applies to the tool, not
necessarily to a normal API client, but it means this hasn't actually been
verified against a live response here). Confirm the field names below
(`facetResults`, `fieldResult`, `label`, `count`) on your first real run —
ALA has migrated API hosts before (biocache-ws -> api.ala.org.au) so if this
fails outright, check https://docs.ala.org.au for the current base URL.

No API key required for basic occurrence search.
"""
from __future__ import annotations

import requests

BASE_URL = "https://biocache-ws.ala.org.au/ws"


class ALAClient:
    def __init__(self, timeout: int = 20):
        self.session = requests.Session()
        self.timeout = timeout

    def species_within_radius(
        self, lat: float, lon: float, radius_km: float = 10, class_name: str = "Aves"
    ) -> list[dict]:
        """Return distinct species of `class_name` recorded within radius_km of
        (lat, lon), as a list of {"scientific_name": str, "count": int}."""
        resp = self.session.get(
            f"{BASE_URL}/occurrences/search",
            params={
                "q": f"class:{class_name}",
                "lat": lat,
                "lon": lon,
                "radius": radius_km,
                "pageSize": 0,
                "facets": "species",
                "flimit": 500,
                "facet": "true",
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        results = []
        for facet_block in data.get("facetResults", []):
            if facet_block.get("fieldName") == "species":
                for field_result in facet_block.get("fieldResult", []):
                    name = field_result.get("label")
                    count = field_result.get("count")
                    if name:
                        results.append({"scientific_name": name, "count": count, "class_name": class_name})
        return results

    def species_within_radius_multi(
        self, lat: float, lon: float, radius_km: float = 10, class_names: list[str] = ("Aves",)
    ) -> list[dict]:
        """Same as species_within_radius but loops over several taxonomic
        classes (one ALA query per class — the Lucene `q` param doesn't
        reliably OR across `class:` values in one call) and concatenates
        the results."""
        results = []
        for class_name in class_names:
            results.extend(self.species_within_radius(lat, lon, radius_km=radius_km, class_name=class_name))
        return results


if __name__ == "__main__":
    import json

    client = ALAClient()
    species = client.species_within_radius_multi(
        -27.4698, 153.0251, radius_km=10, class_names=["Aves", "Mammalia", "Amphibia"]
    )
    print(json.dumps(species[:10], indent=2))
    print(f"Total species: {len(species)}")
