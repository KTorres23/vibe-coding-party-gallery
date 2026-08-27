"""
Queensland WildNet Data API client.

Confirmed LIVE via its OpenAPI spec, fetched 2026-08-26:
https://wildnet-pub.science-data.qld.gov.au/openapi.json
Open, no authentication required.

Endpoints used here:
  GET /api/v1/species-list        - species records matching filters
  GET /api/v1/species-list-row-count
Location can be given as a circular area (central_point_latitude/longitude +
distance in km, 1-100) or a bounding box. Conservation status filters
(status_jurisdiction, status_cat_code, status_type_code) let you flag
Queensland Nature Conservation Act status directly from this same call.
"""
from __future__ import annotations

import requests

BASE_URL = "https://wildnet-pub.science-data.qld.gov.au/api/v1"


class WildNetClient:
    def __init__(self, timeout: int = 30):
        self.session = requests.Session()
        self.timeout = timeout

    def species_near_point(
        self,
        lat: float,
        lng: float,
        distance_km: float = 10,
        class_name: str = "Aves",
        status_jurisdiction: str | None = "QLD",
    ) -> list[dict]:
        """Species records within distance_km of (lat, lng) for one taxonomic
        class (default 'Aves' = birds). Set status_jurisdiction=None to skip
        the NC Act status filter and just get raw records."""
        params = {
            "central_point_latitude": lat,
            "central_point_longitude": lng,
            "distance": min(distance_km, 100),
            "class_name": class_name,
        }
        if status_jurisdiction:
            params["status_jurisdiction"] = status_jurisdiction
        resp = self.session.get(f"{BASE_URL}/species-list", params=params, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def species_near_point_multi(
        self,
        lat: float,
        lng: float,
        distance_km: float = 10,
        class_names: list[str] = ("Aves",),
        status_jurisdiction: str | None = "QLD",
    ) -> list[dict]:
        """Same as species_near_point but loops over several taxonomic classes
        (e.g. ["Aves", "Mammalia", "Amphibia", "Insecta", "Reptilia"] to cover
        "anything that calls") and concatenates the results."""
        results = []
        for class_name in class_names:
            try:
                results.extend(
                    self.species_near_point(
                        lat, lng, distance_km=distance_km, class_name=class_name, status_jurisdiction=status_jurisdiction
                    )
                )
            except Exception as e:
                print(f"  [WildNet class {class_name} failed] {e}")
        return results

    def row_count_near_point(self, lat: float, lng: float, distance_km: float = 10, class_name: str = "Aves") -> int:
        resp = self.session.get(
            f"{BASE_URL}/species-list-row-count",
            params={
                "central_point_latitude": lat,
                "central_point_longitude": lng,
                "distance": min(distance_km, 100),
                "class_name": class_name,
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()


if __name__ == "__main__":
    import json

    client = WildNetClient()
    count = client.row_count_near_point(-27.4698, 153.0251, distance_km=10)
    print(f"Row count: {count}")
    species = client.species_near_point(-27.4698, 153.0251, distance_km=10)
    print(json.dumps(species[:5], indent=2))
