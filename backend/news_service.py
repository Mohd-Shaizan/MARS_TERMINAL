import os
import time
import requests
from datetime import datetime, timedelta

NEWSAPI_KEY  = os.getenv("NEWSAPI_KEY",  "")
GNEWS_KEY    = os.getenv("GNEWS_KEY",    "")  # optional free key: gnews.io

# ── GNews is free (100 req/day) and doesn't rate-limit like DDG ──────────────
GNEWS_URL    = "https://gnews.io/api/v4/search"

GEO_KEYWORDS = (
    "war OR conflict OR sanctions OR military OR economy OR "
    "inflation OR GDP OR interest rate OR trade OR market"
)

# ── Simple rate limiter to avoid DDG blocks ───────────────────────────────────
_last_ddg_call = 0
DDG_MIN_INTERVAL = 3.0  # seconds between DDG calls


def fetch_news(country_name: str = None, max_results: int = 8) -> list:
    """
    Fetch news with 4-layer fallback:
    1. NewsAPI (best quality, requires key)
    2. GNews   (free 100/day, requires key)
    3. DuckDuckGo (free, no key, rate-limited)
    4. RSS feeds (always works, no key, no rate limit)
    """
    if NEWSAPI_KEY:
        result = _fetch_newsapi(country_name, max_results)
        if result:
            return result

    if GNEWS_KEY:
        result = _fetch_gnews(country_name, max_results)
        if result:
            return result

    # Try DDG with rate limiting
    result = _fetch_ddg(country_name, max_results)
    if result:
        return result

    # Final fallback: RSS feeds (no API, no rate limit, always works)
    return _fetch_rss(country_name, max_results)


# ── Layer 1: NewsAPI ──────────────────────────────────────────────────────────
def _fetch_newsapi(country_name: str, max_results: int) -> list:
    query = f"{country_name} ({GEO_KEYWORDS})" if country_name else GEO_KEYWORDS
    from_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    try:
        res  = requests.get(
            "https://newsapi.org/v2/everything",
            params={
                "q": query, "from": from_date, "sortBy": "relevancy",
                "pageSize": max_results, "language": "en", "apiKey": NEWSAPI_KEY,
            },
            timeout=10,
        )
        data = res.json()
        articles = data.get("articles", [])
        return [
            {
                "title":       a.get("title", ""),
                "url":         a.get("url", "#"),
                "source":      a.get("source", {}).get("name", ""),
                "published":   (a.get("publishedAt") or "")[:10],
                "description": a.get("description", "") or "",
            }
            for a in articles
            if a.get("title") and "[Removed]" not in a.get("title", "")
        ]
    except Exception as e:
        print(f"NewsAPI error: {e}")
        return []


# ── Layer 2: GNews (free, 100 req/day) ───────────────────────────────────────
def _fetch_gnews(country_name: str, max_results: int) -> list:
    query = f"{country_name} {GEO_KEYWORDS}" if country_name else GEO_KEYWORDS
    try:
        res  = requests.get(
            GNEWS_URL,
            params={
                "q": query, "lang": "en", "max": max_results,
                "sortby": "relevance", "token": GNEWS_KEY,
            },
            timeout=10,
        )
        data = res.json()
        articles = data.get("articles", [])
        return [
            {
                "title":       a.get("title", ""),
                "url":         a.get("url", "#"),
                "source":      a.get("source", {}).get("name", ""),
                "published":   (a.get("publishedAt") or "")[:10],
                "description": a.get("description", "") or "",
            }
            for a in articles
            if a.get("title")
        ]
    except Exception as e:
        print(f"GNews error: {e}")
        return []


# ── Layer 3: DuckDuckGo (rate-limited, use sparingly) ────────────────────────
def _fetch_ddg(country_name: str, max_results: int) -> list:
    global _last_ddg_call
    now = time.time()
    if now - _last_ddg_call < DDG_MIN_INTERVAL:
        return []  # Skip if called too recently — don't get blocked
    _last_ddg_call = now

    try:
        # Try new package name first, fall back to old
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS
        query = (
            f'"{country_name}" economy OR politics OR conflict OR sanctions 2025 OR 2026'
            if country_name
            else "geopolitical financial markets news 2026"
        )
        articles = []
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results * 2, region="en-us"))
        for r in results:
            url   = r.get("href", "")
            title = r.get("title", "")
            if not title or not url:
                continue
            # Skip non-English
            ascii_ratio = sum(1 for ch in title if ord(ch) < 128) / max(len(title), 1)
            if ascii_ratio < 0.75:
                continue
            articles.append({
                "title":       title,
                "url":         url,
                "source":      r.get("source", ""),
                "published":   datetime.utcnow().strftime("%Y-%m-%d"),
                "description": (r.get("body", "") or "")[:200],
            })
            if len(articles) >= max_results:
                break
        return articles
    except Exception as e:
        print(f"DuckDuckGo error: {e}")
        return []


# ── Layer 4: RSS feeds — always works, no key, no rate limit ─────────────────
# Map country → relevant RSS feed URLs
COUNTRY_RSS = {
    "United States": [
        "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/US.xml",
    ],
    "China": [
        "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
        "https://www.scmp.com/rss/91/feed",
    ],
    "Russia": [
        "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    ],
    "Ukraine": [
        "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    ],
    "India": [
        "https://feeds.bbci.co.uk/news/world/south_asia/rss.xml",
        "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
    ],
    "United Kingdom": [
        "https://feeds.bbci.co.uk/news/uk/rss.xml",
    ],
    "Germany": [
        "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    ],
    "France": [
        "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    ],
    "Israel": [
        "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    ],
    "Iran": [
        "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    ],
    "Saudi Arabia": [
        "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    ],
    "Japan": [
        "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    ],
    "South Korea": [
        "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    ],
    "Brazil": [
        "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    ],
    "Australia": [
        "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    ],
}

# Generic global feed for any country not in the map
GLOBAL_RSS = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
]

def _fetch_rss(country_name: str, max_results: int) -> list:
    """Parse RSS feeds and filter for country-relevant articles."""
    try:
        import xml.etree.ElementTree as ET

        feeds = COUNTRY_RSS.get(country_name, GLOBAL_RSS)
        articles = []

        for feed_url in feeds:
            try:
                res = requests.get(feed_url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
                if res.status_code != 200:
                    continue
                root = ET.fromstring(res.content)

                # Handle both RSS and Atom
                items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")

                for item in items:
                    title = (
                        getattr(item.find("title"), "text", "") or
                        getattr(item.find("{http://www.w3.org/2005/Atom}title"), "text", "")
                    )
                    link = (
                        getattr(item.find("link"), "text", "") or
                        (item.find("{http://www.w3.org/2005/Atom}link") or {}).get("href", "")
                    )
                    desc = (
                        getattr(item.find("description"), "text", "") or
                        getattr(item.find("{http://www.w3.org/2005/Atom}summary"), "text", "") or ""
                    )
                    pub = (
                        getattr(item.find("pubDate"), "text", "") or
                        getattr(item.find("{http://www.w3.org/2005/Atom}updated"), "text", "") or ""
                    )

                    if not title or not link:
                        continue

                    # For generic feeds, filter by country name mention
                    if country_name and feed_url in GLOBAL_RSS:
                        if country_name.lower() not in (title + desc).lower():
                            continue

                    # Skip non-English
                    ascii_ratio = sum(1 for ch in title if ord(ch) < 128) / max(len(title), 1)
                    if ascii_ratio < 0.75:
                        continue

                    articles.append({
                        "title":       title.strip(),
                        "url":         link.strip(),
                        "source":      feed_url.split("/")[2].replace("www.", "").replace("feeds.", ""),
                        "published":   pub[:10] if pub else datetime.utcnow().strftime("%Y-%m-%d"),
                        "description": (desc or "")[:200].strip(),
                    })

                    if len(articles) >= max_results:
                        break

            except Exception as e:
                print(f"RSS feed error ({feed_url}): {e}")
                continue

            if len(articles) >= max_results:
                break

        return articles[:max_results]

    except Exception as e:
        print(f"RSS layer error: {e}")
        return []