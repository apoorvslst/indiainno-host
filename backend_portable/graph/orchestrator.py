"""
LangGraph Orchestrator — main state graph for the civil infrastructure planner.
Nodes: gis → weather → triage → route → [road_chain | water_chain] → build_plan
"""
from __future__ import annotations
import asyncio
from typing import TypedDict, Optional, Any
from langgraph.graph import StateGraph, END
from graph.nodes.triage import run_triage
from graph.nodes.road_chain import run_road_chain
from graph.nodes.water_chain import run_water_chain
from graph.nodes.gis_node import resolve_location
from graph.nodes.weather_node import get_weather_context


# ---------------------------------------------------------------------------
# Graph state definition
# ---------------------------------------------------------------------------

class PlannerState(TypedDict, total=False):
    complaint_text: str
    domain_hint: Optional[str]
    severity_hint: Optional[str]
    location: Optional[str]
    gis_context: dict
    weather_context: dict
    triage: dict
    plan_data: dict
    error: Optional[str]


# ---------------------------------------------------------------------------
# Utility nodes
# ---------------------------------------------------------------------------

async def gis_weather_node(state: PlannerState) -> PlannerState:
    """Resolve GIS and fetch weather in parallel."""
    location = state.get("location", "")
    gis_task = resolve_location(location)
    gis_result = await gis_task

    lat = gis_result.get("lat", 0.0)
    lon = gis_result.get("lon", 0.0)
    weather_result = await get_weather_context(lat, lon, location)

    return {**state, "gis_context": gis_result, "weather_context": weather_result}


def route_complaint(state: PlannerState) -> str:
    """LangGraph routing function — decides which domain chain to run."""
    triage = state.get("triage", {})
    domain = triage.get("domain", "road")
    if domain == "water":
        return "water_chain"
    # Default to road_chain for road, electrical (future expansion), or unknown
    return "road_chain"


# ---------------------------------------------------------------------------
# Build the graph
# ---------------------------------------------------------------------------

def build_graph() -> Any:
    graph = StateGraph(PlannerState)

    # Add all nodes
    graph.add_node("gis_weather", gis_weather_node)
    graph.add_node("triage", run_triage)
    graph.add_node("road_chain", run_road_chain)
    graph.add_node("water_chain", run_water_chain)

    # Entry point
    graph.set_entry_point("gis_weather")

    # Linear until routing
    graph.add_edge("gis_weather", "triage")

    # Conditional routing based on triage domain
    graph.add_conditional_edges(
        "triage",
        route_complaint,
        {
            "road_chain": "road_chain",
            "water_chain": "water_chain",
        },
    )

    # Both domain chains lead to END
    graph.add_edge("road_chain", END)
    graph.add_edge("water_chain", END)

    return graph.compile()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


async def run_pipeline(
    complaint_text: str,
    domain_hint: Optional[str] = None,
    severity_hint: Optional[str] = None,
    location: str = "",
) -> dict:
    """
    Main entry point. Runs the full LangGraph pipeline and returns
    the final state dict containing triage + plan_data.
    """
    graph = get_graph()
    initial_state: PlannerState = {
        "complaint_text": complaint_text,
        "domain_hint": domain_hint,
        "severity_hint": severity_hint,
        "location": location,
    }
    result = await graph.ainvoke(initial_state)
    return result
