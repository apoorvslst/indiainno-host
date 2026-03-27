"""
Pydantic models for the Engineering Implementation Plan JSON schema.
These models define the strict contract between the LLM output and the frontend.
"""
from __future__ import annotations
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid
from datetime import datetime


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class Domain(str, Enum):
    road = "road"
    water = "water"
    electrical = "electrical"

class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class WeatherRisk(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class Coordinates(BaseModel):
    lat: float = Field(0.0, description="Latitude")
    lon: float = Field(0.0, description="Longitude")

class ComplaintInfo(BaseModel):
    raw_text: str
    domain: Domain
    severity: Severity
    location: str
    coordinates: Coordinates = Field(default_factory=Coordinates)

class TriageInfo(BaseModel):
    classification: str = Field(..., description="Short label e.g. 'Standard Pothole Repair'")
    justification: str = Field(..., description="One–two sentence reasoning")
    escalation_required: bool = False
    estimated_crew_size: int = Field(ge=1, le=50)
    urgency_hours: int = Field(ge=1, description="Hours within which work must begin")

class Task(BaseModel):
    task_id: str
    description: str
    assignee_role: str
    duration_hours: float = Field(ge=0.25)
    dependencies: List[str] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.pending

class SafetyRequirement(BaseModel):
    hazard: str
    mitigation: str
    ppe_required: List[str] = Field(default_factory=list)
    regulatory_ref: Optional[str] = None

class Material(BaseModel):
    item: str
    quantity: float
    unit: str
    in_stock: bool = True
    supplier_note: Optional[str] = None

class Equipment(BaseModel):
    name: str
    quantity: int = 1
    rental_required: bool = False

class Phase(BaseModel):
    phase_number: int
    phase_name: str
    estimated_hours: float
    tasks: List[Task] = Field(default_factory=list)
    safety_requirements: List[SafetyRequirement] = Field(default_factory=list)
    materials: List[Material] = Field(default_factory=list)
    equipment: List[Equipment] = Field(default_factory=list)

class QualityAssurance(BaseModel):
    inspection_checkpoints: List[str] = Field(default_factory=list)
    sign_off_roles: List[str] = Field(default_factory=list)
    standards_referenced: List[str] = Field(default_factory=list)

class WeatherContext(BaseModel):
    forecast_summary: str = "Weather data unavailable"
    weather_risk: WeatherRisk = WeatherRisk.low
    adjusted_start_date: str = ""
    weather_notes: str = ""

class SOPReference(BaseModel):
    document: str
    section: str
    relevance: str


# ---------------------------------------------------------------------------
# Root plan model
# ---------------------------------------------------------------------------

class EngineeringPlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    complaint: ComplaintInfo
    triage: TriageInfo
    phases: List[Phase] = Field(default_factory=list)
    quality_assurance: QualityAssurance = Field(default_factory=QualityAssurance)
    weather_context: WeatherContext = Field(default_factory=WeatherContext)
    sop_references: List[SOPReference] = Field(default_factory=list)
    total_estimated_hours: float = 0.0
    total_estimated_cost_inr: float = 0.0


# ---------------------------------------------------------------------------
# API request / response models
# ---------------------------------------------------------------------------

class ComplaintRequest(BaseModel):
    complaint_text: str = Field(..., min_length=10, description="Free-text complaint from citizen")
    domain: Optional[Domain] = None          # If None, auto-detected by triage
    severity: Optional[Severity] = None      # If None, auto-detected by triage
    location: str = Field("", description="Address or area description")

class PlanResponse(BaseModel):
    success: bool
    plan: Optional[EngineeringPlan] = None
    error: Optional[str] = None
    processing_time_seconds: float = 0.0
