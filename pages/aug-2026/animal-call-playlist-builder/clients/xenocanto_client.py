"""
Xeno-canto API v3 client.

IMPORTANT: xeno-canto migrated to API v3 (v2 is now dead). v3 requires a
free account + API key: https://xeno-canto.org/explore/api
Confirmed 2026-08-26 via https://www.freepublicapis.com/xeno-canto-api.

Coverage note now that this pipeline covers "anything that calls": xeno-canto
started as a birds-only archive and has since added dedicated sections for
grasshoppers/crickets (orthoptera), bats (echolocation), and frogs — so
mammal and amphibian calls have real (if smaller) coverage here. Reptiles
are essentially unrepresented (most don't vocalise, and the handful that do
— e.g. some geckos — rarely turn up), so expect most reptile species to fall
through to the Macaulay-candidates manual-review list.

The site runs Anubis bot-protection in front of the API. Tested directly
against api/3/recordings with a real key from this sandbox: it returned an
Anubis "Access Denied" page, not JSON — every attempt was blocked, key or no
key. Anubis specifically targets non-browser HTTP clients (it usually
requires solving a JS proof-of-work challenge that a plain `requests` call
can't do), so this may not just be an IP-reputation issue — a pure
`requests`-based script like this one could get blocked from anywhere.
Before assuming this client works: check xeno-canto's own API docs/forum
for whether registered API keys are allow-listed past Anubis (common
pattern for sites that run this in front of a documented API), and if not,
you may need a headless-browser-based fetch (e.g. Playwright) instead of
plain `requests` for this one client.

License field values look like:
  "//creativecommons.org/licenses/by-nc-sa/4.0/"
  "//creativecommons.org/publicdomain/zero/1.0/"
Free-to-use-safely (no attribution-only-for-noncommercial restriction):
  CC0, CC-BY, CC-BY-SA
NOT safe for a commercial/approvals-adjacent site unless you've deliberately
opted in to NC:
  CC-BY-NC, CC-BY-NC-SA, CC-BY-NC-ND, CC-BY-ND
"""
from __future__ import annotations

import time

import requests

BASE_URL = "https://xeno-canto.org/api/3/recordings"

SAFE_LICENSE_FRAGMENTS = ("publicdomain/zero", "licenses/by/", "licenses/by-sa/")
NC_LICENSE_FRAGMENTS = ("by-nc", "by-nd")


def license_is_safe(lic_url: str | None, allow_nc: bool = False) -> bool:
    if not lic_url:
        return False
    lic_url = lic_url.lower()
    if allow_nc:
        return True  # any CC license accepted once you've explicitly opted in
    if any(frag in lic_url for frag in NC_LICENSE_FRAGMENTS):
        return False
    return any(frag in lic_url for frag in SAFE_LICENSE_FRAGMENTS)


class XenoCantoClient:
    def __init__(self, api_key: str, timeout: int = 20, rate_limit_sec: float = 1.0):
        if not api_key:
            raise ValueError("xeno-canto API v3 requires a key — register at https://xeno-canto.org/explore/api")
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "bird-playlist-builder/1.0 (research use)"})
        self.timeout = timeout
        self.rate_limit_sec = rate_limit_sec

    def search_species(self, scientific_name: str) -> list[dict]:
        """scientific_name e.g. 'Malurus cyaneus'. Returns raw recording dicts."""
        genus, _, species = scientific_name.strip().partition(" ")
        query = f'gen:"{genus}" sp:"{species}"' if species else f'gen:"{genus}"'
        resp = self.session.get(
            BASE_URL,
            params={"query": query, "key": self.api_key},
            timeout=self.timeout,
        )
        time.sleep(self.rate_limit_sec)
        resp.raise_for_status()
        data = resp.json()
        return data.get("recordings", [])

    def best_free_recording(self, scientific_name: str, allow_nc: bool = False) -> dict | None:
        """Pick the best-quality, license-safe recording for a species, or None."""
        recordings = self.search_species(scientific_name)
        candidates = [r for r in recordings if license_is_safe(r.get("lic"), allow_nc=allow_nc)]
        if not candidates:
            return None
        # Quality is 'q' ('A' best .. 'E' worst, or 'no score')
        quality_rank = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}
        candidates.sort(key=lambda r: quality_rank.get(r.get("q", "E"), 5))
        return candidates[0]


if __name__ == "__main__":
    import json
    import os

    key = os.environ.get("XENOCANTO_API_KEY")
    if not key:
        print("Set XENOCANTO_API_KEY env var to smoke-test this module.")
    else:
        client = XenoCantoClient(key)
        best = client.best_free_recording("Malurus cyaneus")
        print(json.dumps(best, indent=2))
