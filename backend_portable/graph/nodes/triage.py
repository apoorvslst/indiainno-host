"""
Triage Node — first LLM call in the pipeline.
Classifies the complaint by domain, severity, and urgency.
Returns structured triage data that drives LangGraph routing.
"""
from __future__ import annotations
import json
import os
from groq import Groq

TRIAGE_SYSTEM_PROMPT = """You are a senior municipal infrastructure triage engineer.
Your ONLY task is to classify incoming infrastructure complaints.
You MUST respond with a single valid JSON object — no prose, no markdown fences.

JSON schema:
{
  "domain": "road" | "water" | "electrical",
  "severity": "low" | "medium" | "high" | "critical",
  "classification": "<short label e.g. 'Standard Pothole Repair'>",
  "justification": "<1-2 sentences explaining why>",
  "escalation_required": true | false,
  "estimated_crew_size": <integer 1-50>,
  "urgency_hours": <integer — hours within which work must begin>
}

Severity guide:
- low: cosmetic / minor, no immediate safety risk, 72+ hours
- medium: moderate disruption, some risk, 48 hours
- high: significant safety risk or major disruption, 24 hours
- critical: imminent danger to life, structural failure, 6 hours

Domain guide:
- road: potholes, cracks, road surface, pavement, markings, drainage on roads
- water: water main, sewage, flooding from pipes, leaks
- electrical: streetlights, overhead lines, transformers, traffic signals
"""


def _get_groq_client() -> Groq:
    return Groq(api_key=os.getenv("GROQ_API_KEY"))


async def run_triage(state: dict) -> dict:
    """
    LangGraph node. Expects state['complaint_text'] and optionally
    state['domain'], state['severity'].
    Updates state with 'triage' dict.
    """
    complaint = state.get("complaint_text", "")
    hint_domain = state.get("domain_hint", "")
    hint_severity = state.get("severity_hint", "")

    extra = ""
    if hint_domain:
        extra += f"\nUser specified domain: {hint_domain}"
    if hint_severity:
        extra += f"\nUser specified severity: {hint_severity}"

    client = _get_groq_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
            {"role": "user", "content": f"Complaint:\n{complaint}{extra}\n\nRespond with JSON only."},
        ],
        temperature=0.1,
    )
    raw = response.choices[0].message.content.strip()

    # Strip any accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        triage = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback defaults
        triage = {
            "domain": hint_domain or "road",
            "severity": hint_severity or "medium",
            "classification": "Unclassified Infrastructure Issue",
            "justification": "Automatic classification failed; using defaults.",
            "escalation_required": False,
            "estimated_crew_size": 4,
            "urgency_hours": 48,
        }

    return {**state, "triage": triage}
