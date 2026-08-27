"""
Macaulay Library has no stable public API for filtering assets by license
(confirmed via eBird/Macaulay support docs, 2026-08-26 —
https://support.ebird.org/en/support/solutions/articles/48001064551-using-and-requesting-media,
https://www.macaulaylibrary.org/ibc-faq/). Only assets explicitly marked
Creative Commons, or flagged "commercially requestable" via the site's own
search filter, are safe to reuse — most catalog media instead requires a
separate commercial license agreement even though it's freely viewable.

So this module does NOT auto-fetch or auto-clear Macaulay audio. It just
builds you a pre-filtered search link per species so a human can quickly
check and hand-pick a track, which then gets recorded (with its catalog
number and the license you actually saw) into data/macaulay_candidates.csv
for the pipeline to pick up.
"""
from __future__ import annotations
from urllib.parse import quote

SEARCH_BASE = "https://search.macaulaylibrary.org/catalog"


def search_url(scientific_name: str) -> str:
    """Deep link to Macaulay Library's audio search for one species.
    Media type and license filters still need to be applied by hand in the UI
    (there's no reliable URL param for 'CC-licensed only' as of this check)."""
    return f"{SEARCH_BASE}?taxonCode=&searchField=scientificName&q={quote(scientific_name)}&mediaType=audio"


def build_candidate_links(scientific_names: list[str]) -> list[dict]:
    return [{"scientific_name": name, "macaulay_search_url": search_url(name)} for name in scientific_names]


if __name__ == "__main__":
    for row in build_candidate_links(["Malurus cyaneus", "Cracticus tibicen"]):
        print(row["scientific_name"], "->", row["macaulay_search_url"])
