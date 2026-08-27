"""
For every species in data/species_list.csv, find a license-clean recording
via Xeno-canto, download the audio, and write data/audio_manifest.json.

Species with no safe Xeno-canto match are written to
data/macaulay_candidates.csv with a pre-filtered Macaulay Library search
link for manual review (see clients/macaulay_helper.py for why that step
isn't automated). Expect this list to skew towards reptiles and some
insects/mammals, since Xeno-canto's non-bird coverage (frogs, grasshoppers,
bats) is real but much thinner than its bird archive.
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from clients.macaulay_helper import search_url
from clients.xenocanto_client import XenoCantoClient

import requests


def main():
    cfg = json.loads(Path("data/site_config.json").read_text())
    allow_nc = cfg.get("allow_nc_licenses", False)
    xc = XenoCantoClient(cfg["xenocanto_api_key"])

    audio_dir = Path("data/audio")
    audio_dir.mkdir(parents=True, exist_ok=True)

    with Path("data/species_list.csv").open() as f:
        species_rows = list(csv.DictReader(f))

    manifest = []
    no_match = []
    unconfirmed = []
    taxon_scoped_sources = {"eBird", "ALA", "WildNet"}

    for row in species_rows:
        name = row["scientific_name"]
        sources = set((row.get("sources") or "").split(","))
        if not sources & taxon_scoped_sources:
            # SNES-only match: SNES covers every EPBC-listed taxon (plants
            # included), so we can't confirm this is actually something that
            # calls. Skip audio fetching and leave it for manual review.
            unconfirmed.append(row)
            continue
        try:
            rec = xc.best_free_recording(name, allow_nc=allow_nc)
        except Exception as e:
            print(f"  [error] {name}: {e}")
            no_match.append(row)
            continue

        if not rec:
            no_match.append(row)
            continue

        file_url = rec.get("file")
        filename = f"{name.replace(' ', '_')}.mp3"
        local_path = audio_dir / filename
        try:
            r = requests.get(file_url, timeout=30)
            r.raise_for_status()
            local_path.write_bytes(r.content)
        except Exception as e:
            print(f"  [download failed] {name}: {e}")
            no_match.append(row)
            continue

        manifest.append(
            {
                "scientific_name": name,
                "common_name": row.get("common_name", ""),
                "sources": row.get("sources", ""),
                "taxon_class": row.get("taxon_class", ""),
                "epbc_status": row.get("epbc_status", ""),
                "presence_category": row.get("presence_category", ""),
                "wildnet_status": row.get("wildnet_status", ""),
                "audio_file": f"audio/{filename}",
                "license": rec.get("lic"),
                "recordist": rec.get("rec"),
                "xeno_canto_id": rec.get("id"),
                "xeno_canto_url": f"https://xeno-canto.org/{rec.get('id')}",
            }
        )
        print(f"  [ok] {name} <- XC{rec.get('id')} ({rec.get('lic')})")

    manifest_path = Path("data/audio_manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"\n{len(manifest)} species matched -> {manifest_path}")

    if no_match:
        candidates_path = Path("data/macaulay_candidates.csv")
        with candidates_path.open("w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["scientific_name", "common_name", "macaulay_search_url"])
            writer.writeheader()
            for row in no_match:
                writer.writerow(
                    {
                        "scientific_name": row["scientific_name"],
                        "common_name": row.get("common_name", ""),
                        "macaulay_search_url": search_url(row["scientific_name"]),
                    }
                )
        print(f"{len(no_match)} species with no clean Xeno-canto match -> {candidates_path} (needs manual review)")

    if unconfirmed:
        unconfirmed_path = Path("data/snes_only_unconfirmed.csv")
        with unconfirmed_path.open("w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["scientific_name", "common_name", "epbc_status", "presence_category", "notes"])
            writer.writeheader()
            for row in unconfirmed:
                writer.writerow(
                    {
                        "scientific_name": row["scientific_name"],
                        "common_name": row.get("common_name", ""),
                        "epbc_status": row.get("epbc_status", ""),
                        "presence_category": row.get("presence_category", ""),
                        "notes": row.get("notes", ""),
                    }
                )
        print(f"{len(unconfirmed)} SNES-only matches skipped (not confirmed via a taxon-scoped source) -> {unconfirmed_path}")


if __name__ == "__main__":
    main()
