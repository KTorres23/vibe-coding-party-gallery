"""
Merge eBird + ALA + WildNet + SNES (all live queries) into one deduplicated,
source-tagged species list covering anything that calls — birds, mammals,
frogs, and (where the data supports it) insects and reptiles.

Output: data/species_list.csv with columns:
  scientific_name, common_name, sources, taxon_class, epbc_status,
  presence_category, wildnet_status, notes

Taxonomic scope is set by `taxonomic_classes` in site_config.json (default:
Aves, Mammalia, Amphibia, Insecta, Reptilia). eBird only ever contributes
the Aves (bird) subset, since it's a birds-only database by design — ALA
and WildNet are queried once per class in the list, so that's where the
non-bird coverage actually comes from.

SNES (Species of National Environmental Significance) covers every
EPBC-listed taxon and this pipeline has no class filter for it (see
clients/snes_client.py) — so any SNES match not also seen via
eBird/ALA/WildNet gets flagged in `notes` as habitat-model-only, since we
can't independently confirm it's a species that actually vocalises (versus,
say, a listed plant) before it goes anywhere near the audio-matching step.

Run after data/site_config.json exists (copy data/site_config.example.json
and fill it in).
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from clients.ala_client import ALAClient
from clients.ebird_client import EBirdClient
from clients.snes_client import SNESClient
from clients.wildnet_client import WildNetClient

FIELDNAMES = [
    "scientific_name",
    "common_name",
    "sources",
    "taxon_class",
    "epbc_status",
    "presence_category",
    "wildnet_status",
    "notes",
]

DEFAULT_TAXONOMIC_CLASSES = ["Aves", "Mammalia", "Amphibia", "Insecta", "Reptilia"]


def load_config() -> dict:
    config_path = Path("data/site_config.json")
    if not config_path.exists():
        print("Missing data/site_config.json — copy data/site_config.example.json and fill it in.")
        sys.exit(1)
    return json.loads(config_path.read_text())


def main():
    cfg = load_config()
    lat, lng, radius = cfg["lat"], cfg["lng"], cfg["radius_km"]
    taxonomic_classes = cfg.get("taxonomic_classes", DEFAULT_TAXONOMIC_CLASSES)

    merged: dict[str, dict] = {}
    taxon_scoped_sources = {"eBird", "ALA", "WildNet"}

    def add(name: str, source: str, extra: dict | None = None):
        name = name.strip()
        if not name:
            return
        entry = merged.setdefault(
            name,
            {
                "scientific_name": name,
                "common_name": "",
                "sources": set(),
                "taxon_class": "",
                "epbc_status": "",
                "presence_category": "",
                "wildnet_status": "",
                "notes": "",
            },
        )
        entry["sources"].add(source)
        if extra:
            entry.update({k: v for k, v in extra.items() if v})

    # --- eBird (birds only, by design) ---
    try:
        ebird = EBirdClient(cfg["ebird_api_key"])
        obs = ebird.recent_nearby_species(lat, lng, dist_km=radius, back_days=cfg.get("ebird_back_days", 30))
        for o in obs:
            add(o.get("sciName", ""), "eBird", {"common_name": o.get("comName", ""), "taxon_class": "Aves"})
        print(f"eBird: {len(obs)} observations")
    except Exception as e:
        print(f"eBird query failed (check ebird_api_key / network): {e}")

    # --- ALA (queried once per taxonomic class) ---
    try:
        ala = ALAClient()
        species = ala.species_within_radius_multi(lat, lng, radius_km=radius, class_names=taxonomic_classes)
        for s in species:
            add(s["scientific_name"], "ALA", {"taxon_class": s.get("class_name", "")})
        print(f"ALA: {len(species)} species across {taxonomic_classes}")
    except Exception as e:
        print(f"ALA query failed: {e}")

    # --- WildNet (queried once per taxonomic class) ---
    try:
        wildnet = WildNetClient()
        records = wildnet.species_near_point_multi(lat, lng, distance_km=radius, class_names=taxonomic_classes)
        for r in records:
            name = r.get("scientific_name") or r.get("species_sci_name") or ""
            add(
                name,
                "WildNet",
                {
                    "wildnet_status": r.get("status_cat_code", "") or r.get("conservation_status", ""),
                    "taxon_class": r.get("class_name", ""),
                },
            )
        print(f"WildNet: {len(records)} records across {taxonomic_classes}")
    except Exception as e:
        print(f"WildNet query failed: {e}")

    # --- SNES (all EPBC-listed taxa; no class filter available) ---
    try:
        snes = SNESClient()
        snes_species = snes.species_near_point(lat, lng, distance_km=radius)
        new_from_snes = 0
        for s in snes_species:
            name = s["scientific_name"]
            is_new = name not in merged
            add(
                name,
                "SNES",
                {
                    "common_name": s.get("common_name", ""),
                    "epbc_status": s.get("epbc_status", ""),
                    "presence_category": s.get("presence_category", ""),
                },
            )
            if is_new:
                new_from_snes += 1
                merged[name]["notes"] = (
                    "SNES habitat model only, not seen in eBird/ALA/WildNet — confirm this is a "
                    "species that actually vocalises before adding audio."
                )
        print(f"SNES: {len(snes_species)} matches ({new_from_snes} not otherwise confirmed via a taxon-scoped source)")
    except Exception as e:
        print(f"SNES query failed: {e}")

    out_path = Path("data/species_list.csv")
    with out_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        for entry in sorted(merged.values(), key=lambda e: e["scientific_name"]):
            entry = dict(entry)
            entry["sources"] = ",".join(sorted(entry["sources"]))
            writer.writerow(entry)

    unconfirmed = sum(1 for e in merged.values() if not e["sources"] & taxon_scoped_sources)
    print(f"\nMerged species list: {len(merged)} unique species -> {out_path}")
    if unconfirmed:
        print(f"{unconfirmed} of those are SNES-only — review data/species_list.csv 'notes' column before running fetch_audio.py.")


if __name__ == "__main__":
    main()
