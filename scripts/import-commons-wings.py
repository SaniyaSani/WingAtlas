#!/usr/bin/env python3
"""Import freely licensed Wikimedia Commons Diptera wing SVGs.

The source catalogue is the EntoWing reference audit generated separately.
Downloaded SVGs are kept as scientific reference plates; EntoWing's labelled,
interactive vein graph remains an independent review layer.
"""

from __future__ import annotations

import argparse
import html
import json
import random
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from urllib.error import HTTPError, URLError
import xml.etree.ElementTree as ET
from pathlib import Path


API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "EntoWing/0.35 (scientific atlas reference importer)"
SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
BLOCKED_TAGS = {"script", "foreignObject", "iframe", "object", "embed"}
ALLOWED_LICENSE_MARKERS = ("CC BY", "CC0", "PUBLIC DOMAIN")


def request_bytes(url: str, attempts: int = 6, timeout: float = 45) -> bytes:
    if "upload.wikimedia.org" in url:
        completed = subprocess.run(
            [
                "curl", "-L", "--fail", "--silent", "--show-error",
                "--retry", "2", "--retry-delay", "2",
                "--max-time", str(max(8, int(timeout))),
                "-A", USER_AGENT, url,
            ],
            check=False,
            capture_output=True,
        )
        if completed.returncode == 0 and completed.stdout:
            return completed.stdout
        raise URLError(completed.stderr.decode("utf-8", errors="replace") or "curl download failed")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read()
        except HTTPError as error:
            last_error = error
            if error.code not in {429, 500, 502, 503, 504}:
                raise
            retry_after = error.headers.get("Retry-After")
            delay = float(retry_after) if retry_after and retry_after.isdigit() else min(18, 2 ** attempt)
        except URLError as error:
            last_error = error
            delay = min(18, 2 ** attempt)
        time.sleep(delay + random.random() * .4)
    assert last_error is not None
    raise last_error


def strip_markup(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", value))).strip()


def slug_family(family: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", family.lower()).strip("-")


def parse_number(value: str | None) -> float | None:
    if not value:
        return None
    match = re.match(r"\s*([0-9]+(?:\.[0-9]+)?)", value)
    return float(match.group(1)) if match else None


def dimensions(root: ET.Element) -> tuple[float, float]:
    view_box = root.attrib.get("viewBox")
    if view_box:
        values = [float(value) for value in re.split(r"[\s,]+", view_box.strip()) if value]
        if len(values) == 4 and values[2] > 0 and values[3] > 0:
            return values[2], values[3]
    width = parse_number(root.attrib.get("width")) or 1000
    height = parse_number(root.attrib.get("height")) or 600
    root.set("viewBox", f"0 0 {width:g} {height:g}")
    return width, height


def sanitise_svg(payload: bytes, family: str, source_page: str) -> tuple[bytes, float, float]:
    parser = ET.XMLParser()
    root = ET.fromstring(payload, parser=parser)
    if root.tag.split("}")[-1] != "svg":
        raise ValueError("download is not an SVG document")

    for parent in root.iter():
        for child in list(parent):
            if child.tag.split("}")[-1] in BLOCKED_TAGS:
                parent.remove(child)
        for attribute in list(parent.attrib):
            local_name = attribute.split("}")[-1]
            value = parent.attrib[attribute].strip()
            if local_name.lower().startswith("on"):
                del parent.attrib[attribute]
            elif local_name == "href" and value and not value.startswith("#") and not value.startswith("data:image/"):
                del parent.attrib[attribute]

    width, height = dimensions(root)
    root.set("role", "img")
    root.set("aria-label", f"{family} wing venation reference")
    root.set("preserveAspectRatio", "xMidYMid meet")
    root.attrib.pop("width", None)
    root.attrib.pop("height", None)

    title = ET.Element(f"{{{SVG_NS}}}title")
    title.text = f"{family} wing venation reference"
    description = ET.Element(f"{{{SVG_NS}}}desc")
    description.text = f"Reference SVG imported from {source_page}; attribution is recorded in the EntoWing source ledger."
    root.insert(0, description)
    root.insert(0, title)

    ET.register_namespace("", SVG_NS)
    ET.register_namespace("xlink", XLINK_NS)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True), width, height


def chunks(values: list[str], size: int) -> list[list[str]]:
    return [values[index:index + size] for index in range(0, len(values), size)]


def fetch_metadata(titles: list[str]) -> dict[str, dict]:
    pages: dict[str, dict] = {}
    for batch in chunks(titles, 40):
        query = urllib.parse.urlencode({
            "action": "query",
            "format": "json",
            "formatversion": "2",
            "prop": "imageinfo",
            "iiprop": "url|size|extmetadata",
            "titles": "|".join(f"File:{title}" for title in batch),
        })
        payload = json.loads(request_bytes(f"{API}?{query}"))
        for page in payload.get("query", {}).get("pages", []):
            if page.get("missing") or not page.get("imageinfo"):
                continue
            pages[page["title"].removeprefix("File:")] = page["imageinfo"][0]
    return pages


def metadata_value(metadata: dict, key: str, fallback: str = "") -> str:
    return str(metadata.get(key, {}).get("value", fallback))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--hosted-fallback", action="store_true", help="Do not fetch missing originals; reference Commons-hosted SVGs instead.")
    args = parser.parse_args()

    if args.catalog.exists():
        records = json.loads(args.catalog.read_text(encoding="utf-8"))
    elif args.manifest.exists():
        previous_manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        records = [
            {
                "family": item["family"],
                "title": item["title"],
                "url": item["sourcePage"],
                "found": True,
            }
            for item in previous_manifest.values()
        ]
    else:
        raise FileNotFoundError(f"Neither catalogue nor existing manifest is available: {args.catalog}")
    candidates = [record for record in records if record.get("found") and str(record.get("title", "")).lower().endswith(".svg")]
    metadata = fetch_metadata([record["title"] for record in candidates])
    args.output.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict] = {}
    skipped: list[str] = []
    for record in candidates:
        family = record["family"]
        title = record["title"]
        info = metadata.get(title)
        if not info:
            skipped.append(f"{family}: metadata unavailable")
            continue
        ext = info.get("extmetadata", {})
        license_name = strip_markup(metadata_value(ext, "LicenseShortName", "Unknown"))
        if not any(marker in license_name.upper() for marker in ALLOWED_LICENSE_MARKERS):
            skipped.append(f"{family}: unsupported licence {license_name}")
            continue

        source_page = record["url"]
        family_id = slug_family(family)
        target = args.output / f"{family_id}.svg"
        original_url = str(info["url"])
        local_asset = target.exists()
        if local_asset:
            cleaned = target.read_bytes()
            width, height = dimensions(ET.fromstring(cleaned))
        elif args.hosted_fallback:
            width = float(info.get("width") or 1000)
            height = float(info.get("height") or 600)
            skipped.append(f"{family}: using hosted SVG")
        else:
            try:
                raw = request_bytes(original_url, attempts=1, timeout=7)
                cleaned, width, height = sanitise_svg(raw, family, source_page)
                target.write_bytes(cleaned)
                local_asset = True
                time.sleep(1.15 + random.random() * .35)
            except (HTTPError, URLError, ET.ParseError, ValueError) as error:
                width = float(info.get("width") or 1000)
                height = float(info.get("height") or 600)
                skipped.append(f"{family}: using hosted SVG after local import failed ({type(error).__name__})")
        manifest[family_id] = {
            "family": family,
            "title": title,
            "assetPath": f"/reference-wings/{family_id}.svg" if local_asset else original_url,
            "sourcePage": source_page,
            "originalUrl": original_url,
            "author": strip_markup(metadata_value(ext, "Artist", "Wikimedia Commons contributor")),
            "credit": strip_markup(metadata_value(ext, "Credit", "")),
            "license": license_name,
            "licenseUrl": strip_markup(metadata_value(ext, "LicenseUrl", "")),
            "width": width,
            "height": height,
            "localAsset": local_asset,
            "referenceOnly": True,
        }
        print(f"imported {family_id}", flush=True)

    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"imported": len(manifest), "skipped": skipped}, ensure_ascii=False))
    return 0 if manifest else 1


if __name__ == "__main__":
    sys.exit(main())
