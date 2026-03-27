# CivicSync Backend - Implementation Guide

## Folder Structure

```
backend_portable/
├── main.py                  # FastAPI application entry point
├── schema.py                # Pydantic data models
├── vector_store.py          # ChromaDB vector store for SOPs
├── seed_vectorstore.py      # Script to ingest SOP documents
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables (GROQ_API_KEY)
├── graph/                   # LangGraph agent orchestration
│   ├── __init__.py
│   ├── orchestrator.py      # Main pipeline runner
│   └── nodes/
│       ├── __init__.py
│       ├── gis_node.py      # GIS/Location resolution (Nominatim/OSM)
│       ├── triage.py        # LLM-based complaint classification (Groq)
│       ├── weather_node.py  # Weather data fetch (Open-Meteo)
│       ├── road_chain.py    # Road repair agent chain
│       └── water_chain.py   # Water main agent chain
└── sops/
    ├── road_repair_sop.txt  # Road repair standard operating procedures
    └── water_main_sop.txt   # Water main repair SOPs
```

---

## File Descriptions

### Root Files

| File | Description |
|------|-------------|
| **main.py** | FastAPI application. Exposes `POST /api/generate-plan` endpoint that accepts complaint text and returns a structured engineering implementation plan. Also provides `GET /api/health` for health checks. |
| **schema.py** | Pydantic models defining the JSON contract. Contains `ComplaintRequest`, `EngineeringPlan`, `Phase`, `Task`, `Material`, `Equipment`, `SafetyRequirement`, `QualityAssurance`, etc. |
| **vector_store.py** | ChromaDB vector store setup. Loads SOP documents, creates embeddings, and provides `get_vector_store()` for retrieval. |
| **seed_vectorstore.py** | One-time script to ingest SOP documents into ChromaDB. Run this before first use. |
| **requirements.txt** | Python dependencies: fastapi, uvicorn, langgraph, chromadb, groq, python-dotenv, pydantic, httpx, openmeteo-requests. |
| **.env** | Environment file. Add `GROQ_API_KEY=gsk_xxxxxxxx` from https://console.groq.com |

---

### graph/ Directory - Agent Orchestration

| File | Description |
|------|-------------|
| **orchestrator.py** | Main LangGraph pipeline. Coordinates GIS → Triage → (Road/Water) Chain. Returns structured plan data with phases, materials, equipment, safety, QA. |
| **gis_node.py** | Resolves location string to lat/lon using Nominatim (OpenStreetMap). Adds coordinates to complaint context. |
| **triage.py** | Uses Groq LLM to classify complaint (domain: road/water/electrical), severity, crew size, urgency hours. Justification for classification. |
| **weather_node.py** | Fetches 7-day weather forecast from Open-Meteo API. Returns risk level and adjusted start date recommendations. |
| **road_chain.py** | Multi-agent chain for road repairs: Safety Agent (hazards/PPE), Resource Agent (materials/equipment), PR Agent (timeline/cost estimation). |
| **water_chain.py** | Multi-agent chain for water main repairs: Safety Agent, Resource Agent, PR Agent with water-specific procedures. |

---

### sops/ Directory - Reference Documents

| File | Description |
|------|-------------|
| **road_repair_sop.txt** | Standard Operating Procedures for road repairs: potholes, cracks, drainage, traffic management, material specifications. |
| **water_main_sop.txt** | SOPs for water main repairs: pipe fitting, pressure testing, safety protocols, equipment, environmental safeguards. |

---

## Quick Start

```powershell
# 1. Navigate to backend folder
cd backend_portable

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure Groq API key
# Edit .env file: GROQ_API_KEY=gsk_xxxxxxxxxxxx

# 4. Seed vector store (first run only)
python seed_vectorstore.py

# 5. Run server
uvicorn main:app --reload --port 8000
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Returns `{status: "ok", groq_key_set: bool}` |
| `/api/vector-store-status` | GET | Returns chunk count from ChromaDB |
| `/api/generate-plan` | POST | Accepts complaint JSON, returns EngineeringPlan |

### Request Example
```json
{
  "complaint_text": "Pothole on MG Road near bus stand, large crack causing traffic issues",
  "domain": "road",
  "severity": "medium",
  "location": "MG Road, City Center"
}
```

### Response (EngineeringPlan)
- `plan_id`: Unique identifier
- `complaint`: Raw text, domain, severity, coordinates
- `triage`: Classification, justification, crew size, urgency hours
- `phases[]`: Phase number, name, tasks, safety, materials, equipment
- `quality_assurance`: Checkpoints, sign-off roles, standards
- `weather_context`: 7-day forecast, risk level, adjusted start date
- `sop_references`: Retrieved SOP document sections
- `total_estimated_hours`, `total_estimated_cost_inr`

---

## How It Works

1. **Complaint Input** → `main.py` receives complaint via `/api/generate-plan`
2. **GIS Resolution** → `gis_node.py` converts address to lat/lon coordinates
3. **LLM Triage** → `triage.py` classifies domain, severity using Groq LLM
4. **Weather Check** → `weather_node.py` fetches forecast for location
5. **Agent Chain** → Either `road_chain.py` or `water_chain.py` runs multi-agent pipeline:
   - Safety Agent identifies hazards and required PPE
   - Resource Agent lists materials and equipment
   - PR Agent estimates timeline and cost
6. **SOP Retrieval** → Vector store retrieves relevant SOP sections
7. **Plan Assembly** → All data compiled into `EngineeringPlan` JSON response
8. **Frontend Display** → Plan rendered in A4 format with editable tasks and approval workflow

---

## Integration with Frontend

The frontend should call:
```
POST http://localhost:8000/api/generate-plan
```

With the JSON request body shown above. The response will contain the full implementation plan ready for display, editing, and approval workflow.

---

## Technologies Used

- **FastAPI** - Web framework
- **LangGraph** - Agent orchestration
- **ChromaDB** - Vector store for SOP retrieval
- **Groq** - LLM for classification and plan generation
- **Nominatim/OSM** - Geocoding
- **Open-Meteo** - Weather data
- **Pydantic** - Data validation
