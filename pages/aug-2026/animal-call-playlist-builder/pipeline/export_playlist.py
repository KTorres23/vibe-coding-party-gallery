"""
Turn data/audio_manifest.json into:
  - webapp/data.json     (for the web page)
  - data/playlist.m3u    (plain downloadable playlist with attribution)
"""
from __future__ import annotations

import json
from pathlib import Path


def main():
    manifest = json.loads(Path("data/audio_manifest.json").read_text())

    webapp_data_path = Path("webapp/data.json")
    webapp_data_path.write_text(json.dumps(manifest, indent=2))
    print(f"Wrote {webapp_data_path}")

    m3u_lines = ["#EXTM3U"]
    for entry in manifest:
        title = f"{entry['common_name']} ({entry['scientific_name']})"
        m3u_lines.append(f"#EXTINF:-1,{title}")
        m3u_lines.append(f"# License: {entry['license']}  Recordist: {entry['recordist']}  Source: {entry['xeno_canto_url']}")
        m3u_lines.append(entry["audio_file"])

    playlist_path = Path("data/playlist.m3u")
    playlist_path.write_text("\n".join(m3u_lines))
    print(f"Wrote {playlist_path} ({len(manifest)} tracks)")


if __name__ == "__main__":
    main()
