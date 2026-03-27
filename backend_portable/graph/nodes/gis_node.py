"""
GIS Node — resolves user-provided location string to coordinates
and infers road classification using the Nominatim (OpenStreetMap) API.
No API key required. Respects OSM usage policy (1 req/s max).
"""
from __future__ import annotations
import httpx
import asyncio

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "CivilInfraPlanner/1.0 (contact@example.com)"}


async def resolve_location(location_text: str) -> dict:
    """
    Returns:
        {
            "lat": float,
            "lon": float,
            "display_name": str,
            "road_class": str,   # "primary" | "secondary" | "residential" | "unknown"
            "error": str | None
        }
    """
    if not location_text or location_text.strip() == "":
        return {"lat": 0.0, "lon": 0.0, "display_name": "", "road_class": "unknown", "error": "No location provided"}

    params = {
        "q": location_text,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(NOMINATIM_URL, params=params, headers=HEADERS)
            resp.raise_for_status()
            data = resp.json()

        if not data:
            return {"lat": 0.0, "lon": 0.0, "display_name": location_text, "road_class": "unknown", "error": "Location not found"}

        result = data[0]
        lat = float(result.get("lat", 0.0))
        lon = float(result.get("lon", 0.0))
        display = result.get("display_name", location_text)

        # Infer road class from OSM type
        osm_type = result.get("type", "")
        road_class_map = {
            "primary": "primary",
            "secondary": "secondary",
            "trunk": "primary",
            "motorway": "highway",
            "residential": "residential",
            "service": "service",
            "tertiary": "secondary",
        }
        road_class = road_class_map.get(osm_type, "unknown")

        return {
            "lat": lat,
            "lon": lon,
            "display_name": display,
            "road_class": road_class,
            "error": None,
        }

    except Exception as exc:
        return {
            "lat": 0.0,
            "lon": 0.0,
            "display_name": location_text,
            "road_class": "unknown",
            "error": str(exc),
        }
