"""
FastAPI main application entry point.
Exposes:
  POST /api/generate-plan   — main pipeline endpoint
  GET  /api/health          — health check
  GET  /api/vector-store-status — check if SOPs are ingested
"""
from __future__ import annotations
import time
import os
import sys
from typing import Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

# Add backend dir to path so imports work
sys.path.insert(0, os.path.dirname(__file__))

from schema import ComplaintRequest, PlanResponse, EngineeringPlan, ComplaintInfo, TriageInfo, WeatherContext, Coordinates
from vector_store import ingest_sops, get_vector_store
from graph.orchestrator import run_pipeline


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Initialising vector store and ingesting SOPs …")
    try:
        n = ingest_sops(force=False)
        print(f"[Startup] Vector store ready with {n} chunks.")
    except Exception as e:
        print(f"[Startup WARNING] Vector store init failed: {e}")
    yield
    print("[Shutdown] Farewell.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Civil Infrastructure AI Planner",
    description="Agentic RAG system that converts infrastructure complaints into structured engineering plans.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok", "groq_key_set": bool(os.getenv("GROQ_API_KEY"))}


@app.get("/api/vector-store-status")
async def vector_store_status():
    try:
        store = get_vector_store()
        count = store._collection.count()
        return {"status": "ok", "chunk_count": count}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/api/generate-plan", response_model=PlanResponse)
async def generate_plan(request: ComplaintRequest):
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server.")

    start = time.time()
    try:
        result = await run_pipeline(
            complaint_text=request.complaint_text,
            domain_hint=request.domain.value if request.domain else None,
            severity_hint=request.severity.value if request.severity else None,
            location=request.location,
        )
    except Exception as e:
        elapsed = time.time() - start
        return PlanResponse(success=False, error=str(e), processing_time_seconds=round(elapsed, 2))

    elapsed = time.time() - start

    triage = result.get("triage", {})
    plan_data = _sanitize_numeric_fields(result.get("plan_data", {}))
    gis = result.get("gis_context", {})
    weather = result.get("weather_context", {})

    try:
        plan = EngineeringPlan(
            complaint=ComplaintInfo(
                raw_text=request.complaint_text,
                domain=triage.get("domain", request.domain or "road"),
                severity=triage.get("severity", request.severity or "medium"),
                location=request.location,
                coordinates=Coordinates(
                    lat=gis.get("lat", 0.0),
                    lon=gis.get("lon", 0.0),
                ),
            ),
            triage=TriageInfo(
                classification=triage.get("classification", "Infrastructure Issue"),
                justification=triage.get("justification", ""),
                escalation_required=triage.get("escalation_required", False),
                estimated_crew_size=triage.get("estimated_crew_size", 4),
                urgency_hours=triage.get("urgency_hours", 48),
            ),
            phases=plan_data.get("phases", []),
            quality_assurance=plan_data.get("quality_assurance", {}),
            weather_context=WeatherContext(**weather) if weather else WeatherContext(),
            sop_references=plan_data.get("sop_references", []),
            total_estimated_hours=plan_data.get("total_estimated_hours", 0.0),
            total_estimated_cost_inr=plan_data.get("total_estimated_cost_inr", 0.0),
        )
    except Exception as e:
        return PlanResponse(success=False, error=f"Schema validation error: {e}", processing_time_seconds=round(elapsed, 2))

    return PlanResponse(success=True, plan=plan, processing_time_seconds=round(elapsed, 2))


def _sanitize_numeric_fields(obj: Any) -> Any:
    """Recursively cast string values that should be numbers to floats."""
    if isinstance(obj, dict):
        new_dict = {}
        for k, v in obj.items():
            val = v
            # Common numeric fields in our schema
            if k in [
                "estimated_hours", "duration_hours", "quantity", 
                "total_estimated_cost_inr", "total_estimated_hours",
                "urgency_hours", "estimated_crew_size", "lat", "lon"
            ]:
                if isinstance(v, (str, int)):
                    try:
                        val = float(v)
                    except (ValueError, TypeError):
                        pass
            new_dict[k] = _sanitize_numeric_fields(val)
        return new_dict
    elif isinstance(obj, list):
        return [_sanitize_numeric_fields(item) for item in obj]
    return obj
