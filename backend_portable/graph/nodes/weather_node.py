"""
Weather Node — fetches 7-day forecast from Open-Meteo (free, no API key).
Assesses construction weather risk and adjusts recommended start date.
"""
from __future__ import annotations
import httpx
from datetime import datetime, timedelta, date
from typing import Optional


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def get_weather_context(lat: float, lon: float, location_name: str = "") -> dict:
    """
    Fetch 7-day forecast and return a structured weather context dict.
    Falls back gracefully if coordinates are missing or API fails.
    """
    if lat == 0.0 and lon == 0.0:
        return _no_weather_context("Coordinates unavailable; weather check skipped.")

    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": [
                "precipitation_sum",
                "windspeed_10m_max",
                "temperature_2m_max",
                "temperature_2m_min",
            ],
            "forecast_days": 7,
            "timezone": "auto",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        daily = data.get("daily", {})
        dates: list[str] = daily.get("time", [])
        precipitation: list[float] = daily.get("precipitation_sum", [0.0] * 7)
        wind: list[float] = daily.get("windspeed_10m_max", [0.0] * 7)
        temp_max: list[float] = daily.get("temperature_2m_max", [25.0] * 7)

        # Risk scoring
        risk_flags = []
        bad_days = []
        for i, d in enumerate(dates):
            p = precipitation[i] or 0.0
            w = wind[i] or 0.0
            t = temp_max[i] or 25.0
            bad = p > 5.0 or w > 40.0 or t > 42.0 or t < 5.0
            if bad:
                risk_flags.append(f"{d}: rain={p:.1f}mm wind={w:.1f}km/h temp={t:.1f}°C")
                bad_days.append(d)

        n_bad = len(bad_days)
        if n_bad == 0:
            risk = "low"
        elif n_bad <= 2:
            risk = "medium"
        else:
            risk = "high"

        # Find first good day for start
        today_str = datetime.utcnow().date().isoformat()
        good_start = today_str
        for i, d in enumerate(dates):
            if d not in bad_days:
                good_start = d
                break

        summary_parts = []
        if n_bad == 0:
            summary_parts.append("Clear conditions forecast for the next 7 days.")
        else:
            summary_parts.append(f"{n_bad} adverse day(s) forecast in the next 7 days.")
        if risk_flags:
            summary_parts.append("Adverse conditions: " + "; ".join(risk_flags[:3]))

        return {
            "forecast_summary": " ".join(summary_parts),
            "weather_risk": risk,
            "adjusted_start_date": good_start,
            "weather_notes": _weather_notes(risk, n_bad),
        }

    except Exception as exc:
        return _no_weather_context(f"Weather API error: {exc}")


def _no_weather_context(reason: str) -> dict:
    return {
        "forecast_summary": reason,
        "weather_risk": "low",
        "adjusted_start_date": datetime.utcnow().date().isoformat(),
        "weather_notes": "Schedule work during dry weather. Check local forecast before mobilisation.",
    }


def _weather_notes(risk: str, bad_days: int) -> str:
    if risk == "low":
        return "Conditions are favourable. Proceed as planned."
    elif risk == "medium":
        return (
            f"{bad_days} day(s) may cause delays. Plan material delivery before adverse weather. "
            "Ensure bitumen is not laid during rain. Keep contingency in schedule."
        )
    else:
        return (
            f"High weather risk: {bad_days} adverse day(s). Delay mobilisation to the adjusted start date. "
            "Do not pour concrete or lay asphalt during rain or extreme heat. "
            "Pre-position materials in a covered staging area."
        )
