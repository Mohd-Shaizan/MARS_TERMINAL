from fastapi import APIRouter, HTTPException
from news_service import fetch_news
from ai_service import generate_signal, generate_risk_score, generate_global_prediction

router = APIRouter()


@router.get("/news")
def get_news(country: str = None, max_results: int = 8):
    """
    GET /intelligence/news?country=India
    Returns latest geopolitical + financial news.
    If country omitted → returns global headlines.
    """
    try:
        articles = fetch_news(country_name=country, max_results=max_results)
        return {"country": country or "Global", "articles": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk")
def get_risk(country: str):
    """
    GET /intelligence/risk?country=India
    Returns risk score 0-10 + label + explanation.
    """
    try:
        articles = fetch_news(country_name=country, max_results=6)
        headlines = [a["title"] for a in articles]
        result = generate_risk_score(country, headlines)
        return {
            "country":   country,
            "headlines": headlines,
            **result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signals")
def get_signals(country: str):
    """
    GET /intelligence/signals?country=India
    Returns BUY/SELL/WATCH signal with confidence + reasoning.
    """
    try:
        articles = fetch_news(country_name=country, max_results=6)
        headlines = [a["title"] for a in articles]
        result = generate_signal(country, headlines)
        return {
            "country":   country,
            "headlines": headlines,
            "articles":  articles,
            **result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/global")
def get_global_prediction():
    """
    GET /intelligence/global
    Returns global market summary + top 5 predicted trades.
    Aggregates headlines from major hotspot countries.
    """
    try:
        hotspots = ["Russia", "Ukraine", "Iran", "Israel", "China", "United States", "India", "Germany"]
        all_headlines = []

        for country in hotspots:
            articles = fetch_news(country_name=country, max_results=3)
            all_headlines.extend([a["title"] for a in articles])

        prediction = generate_global_prediction(all_headlines)
        return {
            "headlines_used": len(all_headlines),
            **prediction,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))