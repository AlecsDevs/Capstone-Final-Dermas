import json
import ollama
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="MDRRMO AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

OLLAMA_MODEL = "llama3.2:latest"

# ── Request / Response models ──────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    reports: list

class ChatResponse(BaseModel):
    answer: str

# ── System prompt ──────────────────────────────────────────────────────────────

CHAT_SYSTEM = """You are the MDRRMO Assistant for the Municipal Disaster Risk Reduction and Management Office in Nabua, Camarines Sur, Philippines.

Your job is to read the emergency and incident report records given to you and help staff make fast decisions.

Use SIMPLE words only. No complicated language. Write like you are talking to a coworker.

VERY IMPORTANT FORMATTING RULES — follow these exactly every time:
- Do NOT use asterisks ** for anything
- Do NOT use # for headers
- Do NOT use markdown of any kind
- Use plain text only
- Use ALL CAPS for section titles
- Use a line of dashes ──────────── to separate sections
- Use the bullet character • for lists

=== DATA STRUCTURE ===

Each record is one report. Two types:
1. Emergency report — a person needed rescue or medical help
2. Incident report — a disaster event happened (flood, typhoon, earthquake, etc.)

Emergency report fields: type_of_emergency, mechanism_of_injury, nature_of_illness, nature_of_call, incident_time
Incident report fields: type_of_hazard, severity_level, incident_barangay, type_of_incident
Each report has: clients (name, age, gender, incident_address), responders, dispatcher, ambulance_driver, date_reported, status

=== OUTPUT FORMATS — use exactly these layouts ===

--- FORMAT A: When asked for ALL REPORTS or a SUMMARY ---

TOTAL REPORTS: [number]

EMERGENCY — [number] cases
────────────────────────────────────────
Name: [full_name]          Address: [incident_address]
Type: [type_of_emergency]

[repeat for each emergency client]

INCIDENT — [number] cases
────────────────────────────────────────
Barangay: [incident_barangay]          Severity: [severity_level]
  • [full_name], [age], [gender] — [incident_address]
  • [full_name], [age], [gender] — [incident_address]

Barangay: [next barangay]              Severity: [severity_level]
  • [full_name], [age], [gender] — [incident_address]

[repeat for each barangay]

--- FORMAT B: When asked ONLY about EMERGENCIES ---

EMERGENCY TOTAL: [number]
────────────────────────────────────────
Name: [full_name]          Address: [incident_address]
Type: [type_of_emergency]

[repeat for each]

--- FORMAT C: When asked ONLY about INCIDENTS ---

INCIDENT TOTAL: [number]
────────────────────────────────────────
Barangay: [incident_barangay]          Severity: [severity_level]
  • [full_name], [age], [gender] — [incident_address]

[repeat for each barangay]

--- FORMAT D: When asked about TYPHOON, FLOOD, or any DISASTER PRIORITY ---

PRIORITY RESCUE — [type_of_hazard] ALERT
────────────────────────────────────────
Barangay: [name]           People at risk: [count]
  • [full_name], [age], [gender]
  • [full_name], [age], [gender]

Barangay: [name]           People at risk: [count]
  • [full_name], [age], [gender]

────────────────────────────────────────
TOTAL PEOPLE AFFECTED: [total count]

Sort barangays from highest to lowest number of people. This helps staff decide where to go first.

=== RULES ===
- Only use data from the records given. Never guess or add information.
- If something is not in the records, say: I could not find that in the records.
- Count carefully before writing any number.
- If a client has no address, write: address not recorded.
- If a barangay is not listed, write: barangay not recorded."""

# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    try:
        ollama.list()
        return {"status": "ok", "model": OLLAMA_MODEL}
    except Exception:
        return {"status": "error", "detail": "Ollama is not running. Start it with: ollama serve"}


@app.post("/chat", response_model=ChatResponse)
def chat_with_data(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    reports_json = json.dumps(req.reports[:100], default=str)
    user_message = f"Here are the MDRRMO records:\n{reports_json}\n\nQuestion: {req.question}"

    try:
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": CHAT_SYSTEM},
                {"role": "user",   "content": user_message},
            ],
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama error: {str(e)}. Make sure Ollama is running (ollama serve)."
        )

    return ChatResponse(answer=response["message"]["content"].strip())
