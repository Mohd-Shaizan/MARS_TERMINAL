from fastapi import APIRouter, HTTPException
from news_service import fetch_news
from ai_service import generate_signal, generate_risk_score, generate_global_prediction

router = APIRouter()


@router.get("/news")
def get_news(country: str = None, max_results: int = 8):
    try:
        articles = fetch_news(country_name=country, max_results=max_results)
        return {"country": country or "Global", "articles": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk")
def get_risk(country: str):
    try:
        articles = fetch_news(country_name=country, max_results=6)
        headlines = [a["title"] for a in articles]
        result = generate_risk_score(country, headlines)
        return {"country": country, "headlines": headlines, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signals")
def get_signals(country: str):
    try:
        articles = fetch_news(country_name=country, max_results=6)
        headlines = [a["title"] for a in articles]
        result = generate_signal(country, headlines)
        return {"country": country, "headlines": headlines, "articles": articles, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/global")
def get_global_prediction():
    try:
        # More hotspots + more articles each = more headlines for better AI analysis
        hotspots = [
            "Russia", "Ukraine", "Iran", "Israel", "China",
            "United States", "India", "Germany", "Saudi Arabia",
            "Taiwan", "North Korea", "Pakistan", "Turkey", "Brazil",
        ]
        all_headlines = []
        all_articles  = []

        for country in hotspots:
            articles = fetch_news(country_name=country, max_results=4)
            for a in articles:
                if a.get("title") and a["title"] not in [x["title"] for x in all_articles]:
                    all_headlines.append(a["title"])
                    all_articles.append(a)

        prediction = generate_global_prediction(all_headlines)
        return {
            "headlines_used": len(all_headlines),
            "headlines":      all_headlines[:20],  # send to frontend for display
            **prediction,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))