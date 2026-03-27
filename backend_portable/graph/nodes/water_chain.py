"""
Water Main Chain — Multi-agent LangGraph sub-graph for water main breaks.
Three specialized agents:
  1. Safety Agent    → identifies life-safety hazards and immediate response
  2. Resource Agent  → determines crew, equipment, materials, phased repair
  3. PR/Routing Agent→ public communications, road diversion, utility notifications
Results are merged into a unified plan JSON.
"""
from __future__ import annotations
import json
import os
from typing import Any
from groq import Groq
from vector_store import retrieve_relevant_sops

_SAFETY_PROMPT = """You are a water infrastructure SAFETY specialist.
Given a water main break complaint + triage, produce ONLY the safety response JSON:
{
  "immediate_actions": ["<string>"],
  "evacuation_required": false,
  "utility_isolation_steps": ["<string>"],
  "safety_phases": [
    {
      "phase_number": 1,
      "phase_name": "Emergency Safety Setup",
      "estimated_hours": 2.0,
      "tasks": [
        {
          "task_id": "S1.1",
          "description": "Cordon off the affected area with safety cones and tape",
          "assignee_role": "Safety Officer",
          "duration_hours": 1.0,
          "dependencies": [],
          "status": "pending"
        }
      ],
      "safety_requirements": [
        {
          "hazard": "Traffic collision",
          "mitigation": "Install high-visibility barriers",
          "ppe_required": ["Reflective Vest", "Hard Hat"],
          "regulatory_ref": "IRC:SP:55-2001"
        }
      ],
      "materials": [],
      "equipment": [{"name": "Safety Cones", "quantity": 10, "rental_required": false}]
    }
  ]
}
Be very specific. Reference IS:12288 and CPHEEO Manual where applicable.
Respond with JSON only."""

_RESOURCE_PROMPT = """You are a water infrastructure RESOURCE ALLOCATION engineer.
Given a water main break complaint + triage + safety plan, produce ONLY the resource and repair phases JSON:
{
  "repair_phases": [
    {
      "phase_number": 2,
      "phase_name": "Excavation and Pipe Access",
      "estimated_hours": 4.0,
      "tasks": [
        {
          "task_id": "R2.1",
          "description": "Excavate to expose the damaged water main section",
          "assignee_role": "Excavator Operator",
          "duration_hours": 3.0,
          "dependencies": [],
          "status": "pending"
        }
      ],
      "safety_requirements": [
        {
          "hazard": "Trench collapse",
          "mitigation": "Install shoring and bracing",
          "ppe_required": ["Hard Hat", "Steel-toe Boots"],
          "regulatory_ref": "IS:3764-1992"
        }
      ],
      "materials": [
        {
          "item": "Ductile Iron Repair Clamp (150mm)",
          "quantity": 1.0,
          "unit": "unit",
          "in_stock": true,
          "supplier_note": "Immediate dispatch"
        }
      ],
      "equipment": [
        {
          "name": "Dewatering Pump (5HP)",
          "quantity": 1,
          "rental_required": true
        }
      ]
    }
  ],
  "total_estimated_cost_inr": 75000.0,
  "crew_breakdown": {"roles": [{"role": "Plumber", "count": 2}, {"role": "Helper", "count": 4}]}
}
Include pipe repair clamps, dewatering pumps, backfill materials. Use INR pricing.
Respond with JSON only."""

_PR_PROMPT = """You are a PUBLIC RELATIONS and UTILITY ROUTING coordinator for municipal works.
Given a water main break complaint + triage, produce ONLY the public comms and QA JSON:
{
  "public_notification": {
    "affected_radius_meters": <int>,
    "water_supply_disruption_hours": <int>,
    "message_to_residents": "<string>",
    "diversion_route": "<string>"
  },
  "utility_notifications": ["<utility: action>"],
  "quality_assurance": {
    "inspection_checkpoints": ["<string>"],
    "sign_off_roles": ["<string>"],
    "standards_referenced": ["<string>"]
  },
  "sop_references": [
    {"document": "<string>", "section": "<string>", "relevance": "<string>"}
  ]
}
IMPORTANT: ALL numerical fields (estimated_hours, duration_hours, quantity, total_estimated_cost_inr, n_bad, etc.) MUST be JSON numbers (e.g., 2.5), NOT strings (e.g., "2.5").
Respond with JSON only."""


def _get_client():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))


def _clean_json(raw: str) -> str:
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:].strip()
    return raw.strip()


async def _call_agent(system_prompt: str, user_content: str) -> dict:
    client = _get_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content + "\n\nRespond with JSON only."},
        ],
        temperature=0.1,
    )
    try:
        data = json.loads(_clean_json(response.choices[0].message.content))
        return _sanitize_numeric_fields(data)
    except json.JSONDecodeError:
        return {"_error": response.content[:300]}


def _sanitize_numeric_fields(obj: Any) -> Any:
    """Recursively cast string values that should be numbers to floats."""
    if isinstance(obj, dict):
        new_dict = {}
        for k, v in obj.items():
            val = v
            if k in ["estimated_hours", "duration_hours", "quantity", "total_estimated_cost_inr", "total_estimated_hours"]:
                if isinstance(v, str):
                    try:
                        val = float(v)
                    except ValueError:
                        pass
            new_dict[k] = _sanitize_numeric_fields(val)
        return new_dict
    elif isinstance(obj, list):
        return [_sanitize_numeric_fields(item) for item in obj]
    return obj


async def run_water_chain(state: dict) -> dict:
    """
    Three-agent parallel-style orchestration (sequential for API rate limits).
    Merges outputs into unified plan_data.
    """
    complaint = state.get("complaint_text", "")
    triage = state.get("triage", {})
    weather = state.get("weather_context", {})
    gis = state.get("gis_context", {})

    # RAG retrieval
    sop_chunks = retrieve_relevant_sops(f"water main break emergency repair {complaint}", k=6)
    sop_text = "\n\n---\n\n".join(
        f"[{c['document']} | score:{c['score']:.2f}]\n{c['content']}" for c in sop_chunks
    )

    base_context = f"""COMPLAINT: {complaint}
TRIAGE: {json.dumps(triage, indent=2)}
LOCATION: {gis.get('display_name', 'Unknown')} (road class: {gis.get('road_class', 'unknown')})
WEATHER: {json.dumps(weather, indent=2)}
SOP EXCERPTS:
{sop_text}"""

    # Agent 1 — Safety
    safety_result = await _call_agent(_SAFETY_PROMPT, base_context)

    # Agent 2 — Resources (informed by safety result)
    resource_context = base_context + f"\n\nSAFETY PLAN:\n{json.dumps(safety_result, indent=2)}"
    resource_result = await _call_agent(_RESOURCE_PROMPT, resource_context)

    # Agent 3 — PR & QA
    pr_result = await _call_agent(_PR_PROMPT, base_context)

    # Merge all phases
    all_phases = []
    safety_phases = safety_result.get("safety_phases", [])
    repair_phases = resource_result.get("repair_phases", [])
    all_phases.extend(safety_phases)
    all_phases.extend(repair_phases)

    # Add QA as final phase if missing
    qa_data = pr_result.get("quality_assurance", {})
    if qa_data and not any(p.get("phase_name", "").lower().startswith("quality") for p in all_phases):
        all_phases.append({
            "phase_number": len(all_phases) + 1,
            "phase_name": "Quality Assurance & Site Restoration",
            "estimated_hours": 2.0,
            "tasks": [
                {"task_id": f"T{len(all_phases)+1}.1", "description": "Pressure test repaired section", "assignee_role": "Site Engineer", "duration_hours": 1.0, "dependencies": [], "status": "pending"},
                {"task_id": f"T{len(all_phases)+1}.2", "description": "Backfill and restore road surface", "assignee_role": "Civil Crew", "duration_hours": 1.0, "dependencies": [], "status": "pending"},
            ],
            "safety_requirements": [],
            "materials": [{"item": "Granular sub-base material", "quantity": 2.0, "unit": "tonnes", "in_stock": True}],
            "equipment": [{"name": "Plate compactor", "quantity": 1, "rental_required": False}],
        })

    total_hours = sum(p.get("estimated_hours", 0) for p in all_phases)
    total_cost = resource_result.get("total_estimated_cost_inr", 0)

    plan_data = {
        "phases": all_phases,
        "quality_assurance": qa_data or {"inspection_checkpoints": [], "sign_off_roles": [], "standards_referenced": []},
        "sop_references": pr_result.get("sop_references", []),
        "total_estimated_hours": total_hours,
        "total_estimated_cost_inr": total_cost,
        "water_specific": {
            "immediate_actions": safety_result.get("immediate_actions", []),
            "evacuation_required": safety_result.get("evacuation_required", False),
            "public_notification": pr_result.get("public_notification", {}),
            "utility_notifications": pr_result.get("utility_notifications", []),
        },
    }

    return {**state, "plan_data": plan_data}
