# Animal Call Playlist Builder

Builds a site-specific species list — covering **anything that calls**:
birds, mammals, frogs, and (where the data supports it) insects and
reptiles — from **eBird**, the **Atlas of Living Australia (ALA)**,
Queensland **WildNet**, and the federal **SNES** (Species of National
Environmental Significance) database. It then matches each species to a
genuinely free-to-use call recording via **Xeno-canto** (cross-checked
against **Macaulay Library** for anything Xeno-canto misses) and builds a
playable web page + downloadable playlist from the result.

## Important reality check before you use this

This was built and reviewed in a sandboxed environment with no general
internet access (only package registries), so **the API-calling code below
has not been executed end-to-end against the live services** — it's written
strictly against each service's documented/verified contract, but you must
run a real smoke test yourself the first time, from wherever you actually
deploy it. Specific risks to expect:

- **Xeno-canto is on API v3** and requires a free account + API key
  (v2 is dead). It also sits behind bot-protection (Anubis) that can
  reject requests that look automated/datacenter-sourced even with a
  valid key — if you hit that, use a normal User-Agent, rate-limit
  yourself (this client already sleeps between calls), and try from a
  normal hosting IP.
- **ALA's `biocache-ws` endpoint** — couldn't be verified live from this
  sandbox (blocked by robots.txt for the fetch tool used here, which
  doesn't necessarily reflect a restriction on a normal API client).
  Treat it as "should work per docs, confirm on first run."
- **SNES** — confirmed schema is real (see below), but a genuine live
  spatial query couldn't be executed end-to-end from this sandbox either;
  the query shape is completely standard ArcGIS REST, so it should just
  work, but confirm on first run.

## Taxonomic scope

Controlled by `taxonomic_classes` in `data/site_config.json`, default:

```json
["Aves", "Mammalia", "Amphibia", "Insecta", "Reptilia"]
```

- **Aves (birds)** — best coverage everywhere (eBird, ALA, WildNet, and
  Xeno-canto's core archive are all birds-first).
- **Mammalia** — ALA/WildNet return mammal records fine; Xeno-canto's
  mammal coverage is mostly bats (echolocation calls) plus a scattering of
  other vocal mammals, so expect gaps.
- **Amphibia (frogs)** — ALA/WildNet return them fine; Xeno-canto has a
  dedicated frog section, so this is a genuinely well-covered group.
- **Insecta** — ALA/WildNet return them fine; Xeno-canto's coverage here is
  specifically grasshoppers/crickets (orthoptera stridulation), so other
  calling insects (e.g. cicadas) may be thin.
- **Reptilia** — included for completeness, but most reptiles don't
  vocalise and Xeno-canto has essentially no reptile recordings. Expect
  this group to mostly end up in the manual-review list, not the playlist.

Drop a class from the list in `site_config.json` if you'd rather not chase
low-yield groups (e.g. remove `"Reptilia"`).

## What's automatable, source by source

| Source | Automatable? | Notes |
|---|---|---|
| eBird | Yes | Birds only, by design (it's a birds-only database). Free API key required (personal eBird account) — register at https://ebird.org/api/keygen. I can't register this for you. |
| ALA | Yes | Open API, no key needed. Queried once per class in `taxonomic_classes`. |
| Qld WildNet | Yes | Open API, no key needed — confirmed live at `wildnet-pub.science-data.qld.gov.au`. Queried once per class in `taxonomic_classes`, with NC Act conservation-status filters built in. |
| SNES (federal) | Yes | Open ArcGIS REST API, no key needed — confirmed live at `gis.environment.gov.au/gispub/rest/services/species/species_discovery_minimap/MapServer` (found via the same services root that also hosts a `pmst` folder, i.e. this is the same data family the PMST tool itself draws on). Covers every EPBC-listed taxon already, no class filter needed — returns modelled "likely to occur" / "may occur" habitat plus EPBC listing status for a point + radius. |
| Xeno-canto | Yes | Free account + API key required (v3). License is a field on every recording, so filtering is precise. Coverage is birds-first, with real but thinner coverage of frogs, grasshoppers/crickets, and bats — see Taxonomic scope above. |
| Macaulay Library / eBird media | **Semi-manual** | No stable public API for filtering by license. `clients/macaulay_helper.py` builds a pre-filtered search link per species — a human still needs to eyeball and pick the track. This is where most reptile/thin-coverage species will end up. |

### Why SNES instead of PMST

Per your earlier call, this pipeline uses the live SNES query instead of a
manually-run PMST report. Worth knowing: SNES is the same underlying
habitat model PMST draws its species-matter results from, but it's
**modelled habitat, not a field record or a legal determination** — DCCEEW's
own metadata says it "does not confirm presence or absence of a species at
a site." Fine for building a playlist; if this project ever needs to
support an actual EPBC referral, that still needs the official PMST PDF
report run separately at pmst.environment.gov.au.

SNES also covers *every* EPBC-listed taxon — including plants — and its API
doesn't expose a taxonomic class field to filter on. So an SNES match only
gets treated as a real animal-that-calls candidate once it's *also* seen
via eBird, ALA, or WildNet (all of which are queried per taxonomic class).
Any SNES-only match is written to `data/snes_only_unconfirmed.csv` instead
of going anywhere near the audio step, so nothing non-animal (or
non-vocal) slips into the playlist silently.

## Setup

```bash
cd bird-playlist
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp data/site_config.example.json data/site_config.json
```

1. Edit `data/site_config.json` to add your **eBird** and **Xeno-canto** API keys (`ebird_api_key` and `xenocanto_api_key`).
2. Adjust location (`lat`/`lng`), radius (`radius_km`), and taxonomic scope if needed.
3. `allow_nc_licenses` stays `false` per default — only **CC0 / CC-BY / CC-BY-SA** recordings are used, nothing marked non-commercial-only.

## Pipeline order

1. `python pipeline/build_species_list.py` → queries eBird + ALA + WildNet
   (each across every class in `taxonomic_classes`) + SNES live, merges by
   scientific name, tags each species by source, taxonomic class, EPBC
   status, presence category, and NC Act status
   → `data/species_list.csv`
2. `python pipeline/fetch_audio.py` → queries Xeno-canto per
   taxon-confirmed species, keeps only license-clean recordings, downloads
   audio into `data/audio/` → `data/audio_manifest.json` (species with no
   clean match go to `data/macaulay_candidates.csv` for manual review;
   SNES-only unconfirmed matches go to `data/snes_only_unconfirmed.csv`)
3. `python pipeline/export_playlist.py` → writes `webapp/data.json`
   (for the web page) and `data/playlist.m3u` (a plain downloadable
   playlist with attribution comments)
4. Open `webapp/index.html` (or host the `webapp/` folder on your site) —
   static, no server required, no build step.

## Site config status

`data/site_config.json` is set for **1 River Terrace, Millbank QLD 4670**, radius 10km.

> **Important:** You must add your own API keys into `data/site_config.json` before running the pipeline:
> - `"ebird_api_key"`: Get a free key at [eBird API Key Registration](https://ebird.org/api/keygen).
> - `"xenocanto_api_key"`: Get a free key at [Xeno-canto API Docs](https://xeno-canto.org/explore/api).

**The coordinates are an approximate geocode, not a verified pin** — every
precise geocoding API I tried to reach was blocked (robots.txt rules on the
fetch tool available in this session), so `lat`/`lng` were estimated from
Millbank's suburb boundary and River Terrace's position along the Burnett
River, landing at `-24.878, 152.318`. That's almost certainly within a few
hundred metres of the real address, which barely matters at a 10km search
radius — but if this feeds anything where "exact site location" matters
(e.g. later cross-referencing against a property boundary or an actual
PMST/approvals submission), pull the real coordinates off the property
title, a GPS reading on site, or a Google Maps pin, and update `lat`/`lng`
in `data/site_config.json` before treating the output as authoritative.

