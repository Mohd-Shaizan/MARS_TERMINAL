import os
import json
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


def _call_gemini(prompt: str, max_tokens: int = 512) -> str:
    """Call Gemini API and return text response."""
    if not GEMINI_API_KEY:
        return ""

    headers = {"Content-Type": "application/json"}
    params  = {"key": GEMINI_API_KEY}
    body    = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.3},
    }

    try:
        res  = requests.post(GEMINI_URL, headers=headers, params=params, json=body, timeout=15)
        data = res.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        return ""


def generate_signal(country: str, news_headlines: list[str]) -> dict:
    """
    Returns BUY / SELL / WATCH signal with confidence and reasoning.
    Falls back to NLP-based signal if no Gemini key.
    """
    headlines_text = "\n".join(f"- {h}" for h in news_headlines[:6])

    if not GEMINI_API_KEY:
        return _nlp_signal(country, news_headlines)

    prompt = f"""You are a financial analyst. Based on the following recent news headlines about {country}, 
generate a trading signal for {country}'s stock market index.

News:
{headlines_text}

Respond ONLY with valid JSON in this exact format (no markdown, no explanation outside JSON):
{{
  "signal": "BUY" or "SELL" or "WATCH",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explanation",
  "risk_score": 0.0 to 10.0
}}"""

    raw = _call_gemini(prompt, max_tokens=200)
    try:
        # Strip markdown code fences if present
        clean = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception:
        return _nlp_signal(country, news_headlines)


def generate_risk_score(country: str, news_headlines: list[str]) -> dict:
    """Returns risk score 0-10 with label and explanation."""
    if not GEMINI_API_KEY:
        return _nlp_risk(news_headlines)

    headlines_text = "\n".join(f"- {h}" for h in news_headlines[:6])

    prompt = f"""You are a geopolitical risk analyst. Based on these recent headlines about {country}, 
rate the geopolitical and financial risk on a scale of 0-10.

Headlines:
{headlines_text}

Respond ONLY with valid JSON (no markdown):
{{
  "risk_score": 0.0 to 10.0,
  "label": "Stable" or "Low" or "Moderate" or "High" or "Critical",
  "explanation": "one sentence"
}}"""

    raw = _call_gemini(prompt, max_tokens=150)
    try:
        clean = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception:
        return _nlp_risk(news_headlines)


def generate_global_prediction(all_headlines: list[str]) -> dict:
    """
    Global market prediction for the AI Signals view.
    Returns summary + top 5 predicted trades.
    """
    if not GEMINI_API_KEY:
        return _fallback_prediction()

    headlines_text = "\n".join(f"- {h}" for h in all_headlines[:15])

    prompt = f"""You are a macro trading strategist. Based on these current global headlines, 
generate a market outlook for the next 24-48 hours.

Headlines:
{headlines_text}

Respond ONLY with valid JSON (no markdown):
{{
  "summary": "2-3 sentence global market summary",
  "global_risk_score": 0.0 to 10.0,
  "top_trades": [
    {{
      "instrument": "e.g. Brent Crude / Gold / S&P 500",
      "direction": "LONG" or "SHORT",
      "confidence": 0.0 to 1.0,
      "reasoning": "one sentence",
      "timeframe": "e.g. 24h / 48h / 1 week"
    }}
  ]
}}

Include exactly 10 trade ideas covering a diverse mix: energy (2), metals (2), equities (2), FX (2), crypto (1), and one wildcard commodity."""

    raw = _call_gemini(prompt, max_tokens=1500)
    try:
        clean = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception:
        return _fallback_prediction()


# ── NLP Fallbacks (no API key) ────────────────────────────────────────────────

CONFLICT_WORDS  = {"war", "conflict", "attack", "invasion", "missile", "sanctions", "coup", "protest", "nuclear", "strike", "escalat"}
POSITIVE_WORDS  = {"deal", "agreement", "growth", "recovery", "trade", "invest", "surge", "rise", "expand", "alliance"}
NEGATIVE_WORDS  = {"recession", "collapse", "crisis", "inflation", "decline", "fall", "tension", "threat", "blockade", "embargo"}


def _score_headlines(headlines: list[str]) -> tuple[float, float]:
    """Returns (sentiment_score -1 to 1, conflict_score 0 to 1)"""
    text = " ".join(headlines).lower()
    words = set(text.split())

    pos_hits      = len(words & POSITIVE_WORDS)
    neg_hits      = len(words & NEGATIVE_WORDS)
    conflict_hits = len(words & CONFLICT_WORDS)

    total = pos_hits + neg_hits or 1
    sentiment = (pos_hits - neg_hits) / total
    conflict  = min(conflict_hits / 3, 1.0)

    return sentiment, conflict


def _nlp_signal(country: str, headlines: list[str]) -> dict:
    sentiment, conflict = _score_headlines(headlines)

    if conflict > 0.5 or sentiment < -0.3:
        signal, conf = "SELL", round(0.5 + abs(sentiment) * 0.3, 2)
    elif sentiment > 0.3 and conflict < 0.2:
        signal, conf = "BUY", round(0.5 + sentiment * 0.3, 2)
    else:
        signal, conf = "WATCH", 0.5

    risk = round(min(10, 3 + conflict * 5 + max(0, -sentiment) * 3), 1)

    return {
        "signal":     signal,
        "confidence": min(conf, 0.95),
        "reasoning":  f"Based on sentiment analysis of {len(headlines)} headlines for {country}.",
        "risk_score": risk,
    }


def _nlp_risk(headlines: list[str]) -> dict:
    sentiment, conflict = _score_headlines(headlines)
    risk = round(min(10, 3 + conflict * 5 + max(0, -sentiment) * 3), 1)

    if risk >= 8:   label = "Critical"
    elif risk >= 6: label = "High"
    elif risk >= 4: label = "Moderate"
    elif risk >= 2: label = "Low"
    else:           label = "Stable"

    return {
        "risk_score":  risk,
        "label":       label,
        "explanation": f"Risk assessed from {len(headlines)} recent headlines.",
    }


def _fallback_prediction() -> dict:
    return {
        "summary": "Global markets face elevated uncertainty driven by Middle East tensions, US-China trade friction, and persistent inflation. Oil and gold are supported by geopolitical risk premiums while equities face headwinds from higher-for-longer rate expectations.",
        "global_risk_score": 7.2,
        "top_trades": [
            {"instrument": "Brent Crude",     "direction": "LONG",  "confidence": 0.74, "reasoning": "Strait of Hormuz tension + OPEC+ supply discipline supports prices", "timeframe": "48h"},
            {"instrument": "WTI Crude",       "direction": "LONG",  "confidence": 0.71, "reasoning": "US strategic reserve drawdown risk + Middle East premium", "timeframe": "1 week"},
            {"instrument": "Gold (XAU/USD)",  "direction": "LONG",  "confidence": 0.78, "reasoning": "Safe haven demand at peak amid multi-front geopolitical stress", "timeframe": "1 week"},
            {"instrument": "Silver (XAG/USD)","direction": "LONG",  "confidence": 0.62, "reasoning": "Follows gold with industrial demand tailwind from green energy", "timeframe": "1 week"},
            {"instrument": "S&P 500",         "direction": "SHORT", "confidence": 0.57, "reasoning": "Rate uncertainty + geopolitical risk premium compressing multiples", "timeframe": "24h"},
            {"instrument": "NIFTY 50",        "direction": "LONG",  "confidence": 0.63, "reasoning": "India benefits from energy diversification and manufacturing shift", "timeframe": "1 week"},
            {"instrument": "USD/JPY",         "direction": "LONG",  "confidence": 0.65, "reasoning": "Dollar strength on risk-off flows + BOJ yield curve control", "timeframe": "48h"},
            {"instrument": "EUR/USD",         "direction": "SHORT", "confidence": 0.59, "reasoning": "ECB rate cut expectations + German manufacturing recession", "timeframe": "48h"},
            {"instrument": "Bitcoin (BTC)",   "direction": "WATCH", "confidence": 0.52, "reasoning": "Geopolitical uncertainty creates both safe-haven and risk-off pressure", "timeframe": "24h"},
            {"instrument": "Natural Gas",     "direction": "LONG",  "confidence": 0.66, "reasoning": "Europe energy security concerns + Russia supply uncertainty", "timeframe": "1 week"},
        ],
    }