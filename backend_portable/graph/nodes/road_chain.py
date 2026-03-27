"""
Road Repair Chain — 3-node LangGraph sub-chain for pothole/road surface issues.
Nodes: retrieve_sop → draft_plan → structure_json
"""
from __future__ import annotations
import json
import os
from groq import Groq
from vector_store import retrieve_relevant_sops

ROAD_PLAN_SYSTEM_PROMPT = """You are a senior civil engineer specialising in road surface repair.
You have been given:
1. A citizen complaint
2. Triage assessment (domain, severity, crew size, urgency)
3. Relevant SOP excerpts retrieved from the municipal engineering manual
4. Weather context
5. Location information

Your task is to generate a COMPLETE engineering implementation plan as a SINGLE valid JSON object.
Do NOT include any prose or markdown — ONLY the JSON object.

The JSON MUST conform exactly to this schema:
{
  "phases": [
    {
      "phase_number": <int>,
      "phase_name": "<string>",
      "estimated_hours": <float>,
      "tasks": [
        {
          "task_id": "<e.g. T1.1>",
          "description": "<specific actionable task>",
          "assignee_role": "<e.g. 'Site Engineer'>",
          "duration_hours": <float>,
          "dependencies": ["<task_id>"],
          "status": "pending"
        }
      ],
      "safety_requirements": [
        {
          "hazard": "<string>",
          "mitigation": "<string>",
          "ppe_required": ["<item>"],
          "regulatory_ref": "<e.g. 'IRC:SP:16-2004 Section 4.2'>"
        }
      ],
      "materials": [
        {
          "item": "<material name>",
          "quantity": <float>,
          "unit": "<string>",
          "in_stock": true,
          "supplier_note": "<optional>"
        }
      ],
      "equipment": [
        {
          "name": "<equipment name>",
          "quantity": <int>,
          "rental_required": false
        }
      ]
    }
  ],
  "quality_assurance": {
    "inspection_checkpoints": ["<string>"],
    "sign_off_roles": ["<string>"],
    "standards_referenced": ["<e.g. 'MoRTH Specifications Section 5'>"]
  },
  "sop_references": [
    {
      "document": "<document name>",
      "section": "<section>",
      "relevance": "<why relevant>"
    }
  ],
  "total_estimated_hours": <float>,
  "total_estimated_cost_inr": <float>
}

Rules:
- Include at least 3 phases: Site Assessment, Repair Execution, Quality Check & Restoration
- Each phase must have at least 2 tasks
- Include realistic Indian material costs (INR)
- Do NOT hallucinate crew names — use roles only
- Reference actual Indian road standards (IRC, MoRTH) where applicable
- Be specific: quantities, dimensions, compaction specifications
"""


async def run_road_chain(state: dict) -> dict:
    """
    LangGraph node for road repair domain.
    Expects state to have: complaint_text, triage, weather_context, gis_context
    """
    complaint = state.get("complaint_text", "")
    triage = state.get("triage", {})
    weather = state.get("weather_context", {})
    gis = state.get("gis_context", {})

    # RAG retrieval
    retrieval_query = f"road pothole repair {triage.get('classification', '')} {complaint}"
    sop_chunks = retrieve_relevant_sops(retrieval_query, k=6)
    sop_text = "\n\n---\n\n".join(
        f"[{c['document']} | score:{c['score']:.2f}]\n{c['content']}" for c in sop_chunks
    )

    context = f"""COMPLAINT: {complaint}

TRIAGE ASSESSMENT:
{json.dumps(triage, indent=2)}

LOCATION & GIS:
Display name: {gis.get('display_name', 'Unknown')}
Road classification: {gis.get('road_class', 'unknown')}
Coordinates: {gis.get('lat', 0)}, {gis.get('lon', 0)}

WEATHER CONTEXT:
{json.dumps(weather, indent=2)}

RETRIEVED SOP EXCERPTS:
{sop_text}
"""

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": ROAD_PLAN_SYSTEM_PROMPT},
            {"role": "user", "content": context + "\n\nRespond with the JSON plan only."},
        ],
        temperature=0.15,
    )
    raw = response.choices[0].message.content.strip()

    # Clean markdown fences
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:].strip()
    raw = raw.strip()

    try:
        plan_data = json.loads(raw)
    except json.JSONDecodeError as e:
        plan_data = {
            "phases": [],
            "quality_assurance": {"inspection_checkpoints": [], "sign_off_roles": [], "standards_referenced": []},
            "sop_references": [],
            "total_estimated_hours": 0,
            "total_estimated_cost_inr": 0,
            "_parse_error": str(e),
            "_raw": raw[:500],
        }

    return {**state, "plan_data": plan_data}
