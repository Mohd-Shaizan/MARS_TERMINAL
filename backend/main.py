from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import market, intelligence

load_dotenv()

app = FastAPI(title="MARS Terminal API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router,       prefix="/market")
app.include_router(intelligence.router, prefix="/intelligence")


@app.get("/")
def root():
    return {
        "status": "MARS Terminal API v2.0 running",
        "endpoints": {
            "market":       ["/market/stocks/{code}", "/market/futures/{code}", "/market/options/{code}", "/market/funds/{code}"],
            "intelligence": ["/intelligence/news?country=India", "/intelligence/risk?country=India", "/intelligence/signals?country=India", "/intelligence/global"],
        }
    }


@app.get("/events")
def get_events():
    return {"events": [
        {"lat": 48.38, "lng": 31.17, "title": "Russia-Ukraine War",          "impact": "Energy + grain markets"},
        {"lat": 32.09, "lng": 34.78, "title": "Israel-Iran Conflict",        "impact": "Middle East escalation"},
        {"lat": 35.69, "lng": 51.39, "title": "US/Israel Strikes on Iran",   "impact": "Regional war risk"},
        {"lat": 26.00, "lng": 56.20, "title": "Strait of Hormuz Oil Crisis", "impact": "Global oil supply risk"},
        {"lat": 23.70, "lng": 121.0, "title": "China-Taiwan Tension",        "impact": "Semiconductor supply risk"},
        {"lat": 10.00, "lng": 115.0, "title": "South China Sea Disputes",    "impact": "Global shipping lanes"},
    ]}