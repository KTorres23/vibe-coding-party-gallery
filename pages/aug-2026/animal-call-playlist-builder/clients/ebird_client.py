"""
eBird API 2.0 client.

Docs / contract verified via community wrapper libraries (ProjectBabbler/ebird-api,
ebirders/ebird-api-requests) and the official eBird API terms page, 2026-08-26:
https://github.com/ProjectBabbler/ebird-api
https://www.birds.cornell.edu/home/ebird-api-terms-of-use/

Requires a free personal API key: https://ebird.org/api/keygen
(You must register this yourself with an eBird account — it can't be done on
your behalf.)

Not executed live in this session (sandbox has no general internet egress) —
verify on first real run.
"""
from __future__ import annotations

import requests

BASE_URL = "https://api.ebird.org/v2"


class EBirdClient:
    def __init__(self, api_key: str, timeout: int = 20):
        if not api_key:
            raise ValueError("eBird API key is required — get one at https://ebird.org/api/keygen")
        self.session = requests.Session()
        self.session.headers.update({"X-eBirdApiToken": api_key})
        self.timeout = timeout

    def recent_nearby_species(self, lat: float, lng: float, dist_km: int = 25, back_days: int = 30) -> list[dict]:
        """Species observed within `dist_km` of (lat, lng) in the last `back_days`.

        eBird caps dist at 50km and back at 30 days per call.
        """
        dist_km = min(dist_km, 50)
        back_days = min(back_days, 30)
        resp = self.session.get(
            f"{BASE_URL}/data/obs/geo/recent",
            params={"lat": lat, "lng": lng, "dist": dist_km, "back": back_days},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def region_species_list(self, region_code: str) -> list[str]:
        """Full historical checklist of species codes ever reported in a region
        (e.g. 'AU-QLD' or a finer subregion code from `region_list`)."""
        resp = self.session.get(f"{BASE_URL}/product/spplist/{region_code}", timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def region_list(self, region_type: str, parent_region_code: str) -> list[dict]:
        """List subregions of a parent region, e.g. region_type='subnational2',
        parent_region_code='AU-QLD' to get Queensland LGAs and their codes."""
        resp = self.session.get(
            f"{BASE_URL}/ref/region/list/{region_type}/{parent_region_code}", timeout=self.timeout
        )
        resp.raise_for_status()
        return resp.json()

    def taxonomy_lookup(self, species_codes: list[str]) -> list[dict]:
        """Resolve eBird species codes to common/scientific names."""
        resp = self.session.get(
            f"{BASE_URL}/ref/taxonomy/ebird",
            params={"species": ",".join(species_codes), "fmt": "json"},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()


if __name__ == "__main__":
    import json
    import os

    key = os.environ.get("EBIRD_API_KEY")
    if not key:
        print("Set EBIRD_API_KEY env var to smoke-test this module.")
    else:
        client = EBirdClient(key)
        obs = client.recent_nearby_species(-27.4698, 153.0251, dist_km=10, back_days=14)
        print(json.dumps(obs[:5], indent=2))
