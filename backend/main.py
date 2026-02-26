from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "TANFIBER SHIELD Backend Running"}

@app.get("/risk")
def get_risk():
    return {
        "ivi_score": 62.8,
        "risk_level": "High",
        "max_risk": 81.3,
        "threat_count": 27
    }