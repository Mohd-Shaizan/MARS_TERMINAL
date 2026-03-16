from fastapi import APIRouter, HTTPException
import yfinance as yf
import pandas as pd
from country_map import (
    COUNTRY_INDEX_MAP,
    COUNTRY_FUTURES_MAP,
    COUNTRY_FUNDS_MAP,
    COUNTRY_NAMES,
    ETF_PROXY,
)

router = APIRouter()


def serialize(df: pd.DataFrame) -> list:
    df = df.reset_index()
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime("%Y-%m-%d %H:%M")
    # Drop timezone-aware columns yfinance sometimes adds
    df = df.loc[:, ~df.columns.str.contains("Dividends|Stock Splits|Capital Gains")]
    return df.to_dict(orient="records")


def safe_fetch(symbol: str, period: str = "1mo", interval: str = "1d") -> pd.DataFrame:
    """Try fetching with given interval; fall back to 1d if empty."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        if hist.empty and interval != "1d":
            hist = ticker.history(period=period, interval="1d")
        return ticker, hist
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"yfinance error for {symbol}: {str(e)}")


# ── Supported countries ───────────────────────────────────────────────────────

@router.get("/supported")
def get_supported_countries():
    return {code: COUNTRY_NAMES.get(code, code) for code in COUNTRY_INDEX_MAP}


# ── Stock index ───────────────────────────────────────────────────────────────

@router.get("/stocks/{country_code}")
def get_stocks(country_code: str, period: str = "1mo", interval: str = "1d"):
    code = country_code.upper()
    ticker_symbol = COUNTRY_INDEX_MAP.get(code)
    if not ticker_symbol:
        raise HTTPException(status_code=404, detail=f"No index mapped for: {code}")

    ticker, hist = safe_fetch(ticker_symbol, period, interval)

    if hist.empty:
        raise HTTPException(status_code=404, detail=f"No data returned for {ticker_symbol}. Market may be closed or ticker delisted.")

    try:
        info = ticker.fast_info
        last_price = float(getattr(info, "last_price", None) or hist["Close"].iloc[-1])
        prev_close = float(getattr(info, "previous_close", None) or hist["Close"].iloc[-2] if len(hist) > 1 else last_price)
        currency   = getattr(info, "currency", "USD")
    except Exception:
        last_price = float(hist["Close"].iloc[-1]) if not hist.empty else None
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else last_price
        currency   = "USD"

    cols = [c for c in ["Open", "High", "Low", "Close", "Volume"] if c in hist.columns]
    return {
        "country":        COUNTRY_NAMES.get(code, code),
        "country_code":   code,
        "ticker":         ticker_symbol,
        "currency":       currency,
        "last_price":     last_price,
        "previous_close": prev_close,
        "data":           serialize(hist[cols]),
    }


# ── Futures ───────────────────────────────────────────────────────────────────

@router.get("/futures/{country_code}")
def get_futures(country_code: str, period: str = "1mo", interval: str = "1d"):
    code = country_code.upper()
    tickers_list = COUNTRY_FUTURES_MAP.get(code)

    # Fallback chain: ETF proxy → index proxy
    if not tickers_list:
        # Prefer ETF proxy (more reliable than index for intraday data)
        etf = ETF_PROXY.get(code)
        fallback = COUNTRY_INDEX_MAP.get(code)
        if etf:
            tickers_list = [etf]
        elif fallback:
            tickers_list = [fallback]
        else:
            raise HTTPException(status_code=404, detail=f"No futures data for: {code}")

    results = []
    for symbol in tickers_list:
        try:
            ticker, hist = safe_fetch(symbol, period, interval)
            if hist.empty:
                continue
            cols = [c for c in ["Open", "High", "Low", "Close", "Volume"] if c in hist.columns]
            info = ticker.fast_info
            results.append({
                "ticker":         symbol,
                "last_price":     float(getattr(info, "last_price", None) or hist["Close"].iloc[-1]),
                "previous_close": float(getattr(info, "previous_close", None) or hist["Close"].iloc[-2] if len(hist) > 1 else 0),
                "data":           serialize(hist[cols]),
            })
        except Exception:
            continue

    if not results:
        raise HTTPException(status_code=404, detail=f"No futures data available for {code}")

    return {
        "country":      COUNTRY_NAMES.get(code, code),
        "country_code": code,
        "futures":      results,
    }


# ── Options ───────────────────────────────────────────────────────────────────

# ETF_PROXY imported from country_map

@router.get("/options/{country_code}")
def get_options(country_code: str):
    code = country_code.upper()
    symbol = ETF_PROXY.get(code)

    if not symbol:
        raise HTTPException(status_code=404, detail=f"No options proxy ETF for: {code}. Try US, IN, DE, JP, GB, CN, BR, KR, AU, FR.")

    try:
        ticker  = yf.Ticker(symbol)
        expiries = ticker.options
        if not expiries:
            raise HTTPException(status_code=404, detail=f"No option expiry dates for {symbol}")

        chain = ticker.option_chain(expiries[0])

        def clean_chain(df):
            keep = ["strike", "lastPrice", "bid", "ask", "volume", "openInterest", "impliedVolatility"]
            cols = [c for c in keep if c in df.columns]
            return df[cols].fillna(0).to_dict(orient="records")

        return {
            "country":      COUNTRY_NAMES.get(code, code),
            "country_code": code,
            "ticker":       symbol,
            "expiry":       expiries[0],
            "all_expiries": list(expiries[:6]),
            "calls":        clean_chain(chain.calls),
            "puts":         clean_chain(chain.puts),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Options fetch failed for {symbol}: {str(e)}")


# ── Mutual Funds ──────────────────────────────────────────────────────────────

@router.get("/funds/{country_code}")
def get_funds(country_code: str, period: str = "1mo", interval: str = "1d"):
    code = country_code.upper()
    fund_tickers = COUNTRY_FUNDS_MAP.get(code)

    # Fallback: use ETF proxy list
    if not fund_tickers:
        etf = ETF_PROXY.get(code)
        if not etf:
            raise HTTPException(status_code=404, detail=f"No fund data for: {code}")
        fund_tickers = [etf]

    results = []
    for symbol in fund_tickers:
        try:
            ticker, hist = safe_fetch(symbol, period, interval)
            if hist.empty:
                continue
            cols = [c for c in ["Open", "High", "Low", "Close", "Volume"] if c in hist.columns]

            # get long name safely
            try:
                name = ticker.info.get("longName") or ticker.info.get("shortName") or symbol
            except Exception:
                name = symbol

            info = ticker.fast_info
            results.append({
                "ticker":         symbol,
                "name":           name,
                "last_price":     float(getattr(info, "last_price", None) or hist["Close"].iloc[-1]),
                "previous_close": float(getattr(info, "previous_close", None) or hist["Close"].iloc[-2] if len(hist) > 1 else 0),
                "data":           serialize(hist[cols]),
            })
        except Exception:
            continue

    if not results:
        raise HTTPException(status_code=404, detail=f"No fund data available for {code}")

    return {
        "country":      COUNTRY_NAMES.get(code, code),
        "country_code": code,
        "funds":        results,
    }


# ── Live FX / Commodity / Crypto prices ──────────────────────────────────────

FX_TICKERS = {
    # Forex
    "XAU/USD": {"ticker": "GC=F",     "name": "Gold / US Dollar",   "category": "Forex"},
    "EUR/USD": {"ticker": "EURUSD=X",  "name": "Euro / US Dollar",   "category": "Forex"},
    "USD/JPY": {"ticker": "JPY=X",     "name": "USD / Japanese Yen", "category": "Forex"},
    "GBP/USD": {"ticker": "GBPUSD=X",  "name": "British Pound / USD","category": "Forex"},
    "WTI/USD": {"ticker": "CL=F",      "name": "Crude Oil / USD",    "category": "Forex"},
    "BTC/USD": {"ticker": "BTC-USD",   "name": "Bitcoin / USD",      "category": "Forex"},
    # Commodities
    "GOLD":    {"ticker": "GC=F",      "name": "Gold Spot",          "category": "Commodities"},
    "SILVER":  {"ticker": "SI=F",      "name": "Silver Spot",        "category": "Commodities"},
    "BRENT":   {"ticker": "BZ=F",      "name": "Brent Crude Oil",    "category": "Commodities"},
    "WTI":     {"ticker": "CL=F",      "name": "WTI Crude Oil",      "category": "Commodities"},
    "COPPER":  {"ticker": "HG=F",      "name": "Copper Futures",     "category": "Commodities"},
    "NATGAS":  {"ticker": "NG=F",      "name": "Natural Gas",        "category": "Commodities"},
    "SOYBEAN": {"ticker": "ZS=F",      "name": "Soybean Futures",    "category": "Commodities"},
    "CORN":    {"ticker": "ZC=F",      "name": "Corn Futures",       "category": "Commodities"},
    # Crypto
    "ETH/USD": {"ticker": "ETH-USD",   "name": "Ethereum / USD",     "category": "Crypto"},
    "SOL/USD": {"ticker": "SOL-USD",   "name": "Solana / USD",       "category": "Crypto"},
    "XRP/USD": {"ticker": "XRP-USD",   "name": "XRP / USD",          "category": "Crypto"},
    "BNB/USD": {"ticker": "BNB-USD",   "name": "BNB / USD",          "category": "Crypto"},
    "ADA/USD": {"ticker": "ADA-USD",   "name": "Cardano / USD",      "category": "Crypto"},
    "DOGE/USD":{"ticker": "DOGE-USD",  "name": "Dogecoin / USD",     "category": "Crypto"},
}


def fmt_price(val: float, pair: str) -> str:
    if val is None:
        return "--"
    if pair in ("BTC/USD",):
        return f"{val:,.0f}"
    if pair in ("ETH/USD", "BNB/USD"):
        return f"{val:,.2f}"
    if pair in ("XRP/USD", "ADA/USD", "DOGE/USD", "SOL/USD"):
        return f"{val:.4f}"
    return f"{val:.4f}" if val < 100 else f"{val:,.2f}"


@router.get("/fx")
def get_fx_prices(category: str = None):
    """
    GET /market/fx                    → all pairs
    GET /market/fx?category=Forex     → only Forex
    GET /market/fx?category=Commodities
    GET /market/fx?category=Crypto
    """
    pairs_to_fetch = {
        k: v for k, v in FX_TICKERS.items()
        if category is None or v["category"] == category
    }

    # Use fast_info per ticker — gives closest to real-time price on Yahoo free tier (~15min delay)
    results = {}
    for pair, meta in pairs_to_fetch.items():
        sym = meta["ticker"]
        try:
            ticker = yf.Ticker(sym)
            fi     = ticker.fast_info

            last = float(getattr(fi, "last_price",    None) or 0)
            prev = float(getattr(fi, "previous_close", None) or 0)

            # Fallback to daily history if fast_info returns 0
            if last == 0:
                hist = ticker.history(period="2d", interval="1d")
                if hist.empty:
                    results[pair] = _fx_placeholder(pair, meta)
                    continue
                last = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else last

            if prev == 0:
                prev = last

            diff = last - prev
            pct  = (diff / prev * 100) if prev else 0
            pos  = diff >= 0

            day_high = float(getattr(fi, "day_high",    None) or last)
            day_low  = float(getattr(fi, "day_low",     None) or last)
            vol      = float(getattr(fi, "last_volume", None) or 0)
            vol_s    = (f"{int(vol/1_000_000)}M" if vol >= 1_000_000
                        else f"{int(vol/1000)}K"  if vol >= 1000
                        else "--")

            price_s  = fmt_price(last, pair)
            change_s = f"{'+' if pos else ''}{pct:.2f}%"
            abs_s    = f"{'+' if pos else ''}{fmt_price(abs(diff), pair)}"

            results[pair] = {
                "pair":      pair,
                "name":      meta["name"],
                "category":  meta["category"],
                "price":     price_s,
                "change":    change_s,
                "changeAbs": abs_s,
                "bid":       fmt_price(last * 0.9999, pair),
                "ask":       fmt_price(last * 1.0001, pair),
                "high":      fmt_price(day_high, pair),
                "low":       fmt_price(day_low,  pair),
                "volume":    vol_s,
                "positive":  pos,
                "raw":       last,
            }
        except Exception:
            results[pair] = _fx_placeholder(pair, meta)

    return results


def _fx_placeholder(pair: str, meta: dict) -> dict:
    return {
        "pair":      pair,
        "name":      meta["name"],
        "category":  meta["category"],
        "price":     "--",
        "change":    "--",
        "changeAbs": "--",
        "bid":       "--",
        "ask":       "--",
        "high":      "--",
        "low":       "--",
        "volume":    "--",
        "positive":  True,
        "raw":       None,
    }


# ── Country Info + Forex ──────────────────────────────────────────────────────

# Country metadata: currency code, forex ticker, economic indicators
COUNTRY_META = {
    "US": {"currency":"USD","forex":None,        "gdp":"$27.4T","inflation":"3.2%","rate":"5.25%","exchange":"NYSE/NASDAQ"},
    "IN": {"currency":"INR","forex":"USDINR=X",  "gdp":"$3.7T", "inflation":"5.1%","rate":"6.50%","exchange":"NSE/BSE"},
    "CN": {"currency":"CNY","forex":"USDCNY=X",  "gdp":"$17.8T","inflation":"0.3%","rate":"3.45%","exchange":"SSE/SZSE"},
    "JP": {"currency":"JPY","forex":"JPY=X",     "gdp":"$4.2T", "inflation":"3.2%","rate":"-0.10%","exchange":"TSE"},
    "DE": {"currency":"EUR","forex":"EURUSD=X",  "gdp":"$4.1T", "inflation":"2.3%","rate":"4.50%","exchange":"XETRA"},
    "GB": {"currency":"GBP","forex":"GBPUSD=X",  "gdp":"$3.1T", "inflation":"4.0%","rate":"5.25%","exchange":"LSE"},
    "FR": {"currency":"EUR","forex":"EURUSD=X",  "gdp":"$2.9T", "inflation":"2.4%","rate":"4.50%","exchange":"Euronext"},
    "KR": {"currency":"KRW","forex":"USDKRW=X",  "gdp":"$1.7T", "inflation":"3.6%","rate":"3.50%","exchange":"KRX"},
    "AU": {"currency":"AUD","forex":"AUDUSD=X",  "gdp":"$1.7T", "inflation":"4.1%","rate":"4.35%","exchange":"ASX"},
    "CA": {"currency":"CAD","forex":"USDCAD=X",  "gdp":"$2.1T", "inflation":"3.4%","rate":"5.00%","exchange":"TSX"},
    "BR": {"currency":"BRL","forex":"USDBRL=X",  "gdp":"$2.1T", "inflation":"4.6%","rate":"10.75%","exchange":"B3"},
    "RU": {"currency":"RUB","forex":"USDRUB=X",  "gdp":"$2.2T", "inflation":"7.5%","rate":"16.00%","exchange":"MOEX (Sanctioned)"},
    "MX": {"currency":"MXN","forex":"USDMXN=X",  "gdp":"$1.3T", "inflation":"4.7%","rate":"11.25%","exchange":"BMV"},
    "IT": {"currency":"EUR","forex":"EURUSD=X",  "gdp":"$2.1T", "inflation":"0.6%","rate":"4.50%","exchange":"Borsa Italiana"},
    "ES": {"currency":"EUR","forex":"EURUSD=X",  "gdp":"$1.6T", "inflation":"3.3%","rate":"4.50%","exchange":"BME"},
    "NL": {"currency":"EUR","forex":"EURUSD=X",  "gdp":"$1.0T", "inflation":"2.7%","rate":"4.50%","exchange":"Euronext AMS"},
    "CH": {"currency":"CHF","forex":"USDCHF=X",  "gdp":"$0.9T", "inflation":"1.7%","rate":"1.75%","exchange":"SIX"},
    "SE": {"currency":"SEK","forex":"USDSEK=X",  "gdp":"$0.6T", "inflation":"8.5%","rate":"4.00%","exchange":"Nasdaq OMX"},
    "NO": {"currency":"NOK","forex":"USDNOK=X",  "gdp":"$0.6T", "inflation":"4.8%","rate":"4.50%","exchange":"Oslo Bors"},
    "SA": {"currency":"SAR","forex":"USDSAR=X",  "gdp":"$1.1T", "inflation":"1.6%","rate":"6.00%","exchange":"Tadawul"},
    "AE": {"currency":"AED","forex":"USDAED=X",  "gdp":"$0.5T", "inflation":"3.1%","rate":"5.40%","exchange":"DFM/ADX"},
    "SG": {"currency":"SGD","forex":"USDSGD=X",  "gdp":"$0.5T", "inflation":"3.6%","rate":"3.68%","exchange":"SGX"},
    "HK": {"currency":"HKD","forex":"USDHKD=X",  "gdp":"$0.4T", "inflation":"2.1%","rate":"5.75%","exchange":"HKEX"},
    "TW": {"currency":"TWD","forex":"USDTWD=X",  "gdp":"$0.8T", "inflation":"2.5%","rate":"2.00%","exchange":"TWSE"},
    "TR": {"currency":"TRY","forex":"USDTRY=X",  "gdp":"$1.1T", "inflation":"65.0%","rate":"45.00%","exchange":"Borsa Istanbul"},
    "PL": {"currency":"PLN","forex":"USDPLN=X",  "gdp":"$0.7T", "inflation":"6.2%","rate":"5.75%","exchange":"WSE"},
    "ZA": {"currency":"ZAR","forex":"USDZAR=X",  "gdp":"$0.4T", "inflation":"5.9%","rate":"8.25%","exchange":"JSE"},
    "EG": {"currency":"EGP","forex":"USDEGP=X",  "gdp":"$0.4T", "inflation":"35.0%","rate":"21.25%","exchange":"EGX"},
    "NG": {"currency":"NGN","forex":"USDNGN=X",  "gdp":"$0.5T", "inflation":"28.9%","rate":"18.75%","exchange":"NGX"},
    "IL": {"currency":"ILS","forex":"USDILS=X",  "gdp":"$0.5T", "inflation":"3.7%","rate":"4.75%","exchange":"TASE"},
    "TH": {"currency":"THB","forex":"USDTHB=X",  "gdp":"$0.5T", "inflation":"1.2%","rate":"2.50%","exchange":"SET"},
    "ID": {"currency":"IDR","forex":"USDIDR=X",  "gdp":"$1.4T", "inflation":"2.6%","rate":"6.00%","exchange":"IDX"},
    "MY": {"currency":"MYR","forex":"USDMYR=X",  "gdp":"$0.4T", "inflation":"1.8%","rate":"3.00%","exchange":"Bursa"},
    "PH": {"currency":"PHP","forex":"USDPHP=X",  "gdp":"$0.4T", "inflation":"3.9%","rate":"6.50%","exchange":"PSE"},
    "PK": {"currency":"PKR","forex":"USDPKR=X",  "gdp":"$0.3T", "inflation":"23.0%","rate":"22.00%","exchange":"PSX"},
    "VN": {"currency":"VND","forex":"USDVND=X",  "gdp":"$0.4T", "inflation":"3.5%","rate":"4.50%","exchange":"HOSE"},
    "AR": {"currency":"ARS","forex":"USDARS=X",  "gdp":"$0.6T", "inflation":"211.0%","rate":"100.00%","exchange":"BCBA"},
    "CL": {"currency":"CLP","forex":"USDCLP=X",  "gdp":"$0.3T", "inflation":"4.5%","rate":"6.00%","exchange":"BCS"},
    "CO": {"currency":"COP","forex":"USDCOP=X",  "gdp":"$0.3T", "inflation":"9.3%","rate":"13.25%","exchange":"BVC"},
    "NZ": {"currency":"NZD","forex":"NZDUSD=X",  "gdp":"$0.2T", "inflation":"4.7%","rate":"5.50%","exchange":"NZX"},
    "QA": {"currency":"QAR","forex":"USDQAR=X",  "gdp":"$0.2T", "inflation":"1.0%","rate":"6.00%","exchange":"QSE"},
}


@router.get("/country-info/{country_code}")
def get_country_info(country_code: str):
    """
    GET /market/country-info/IN
    Returns currency, forex rate, economic indicators, and forex history.
    """
    code = country_code.upper()
    meta = COUNTRY_META.get(code, {
        "currency": "USD", "forex": None,
        "gdp": "N/A", "inflation": "N/A", "rate": "N/A", "exchange": "N/A"
    })

    forex_rate    = None
    forex_history = []
    forex_ticker  = meta.get("forex")

    if forex_ticker:
        try:
            ticker = yf.Ticker(forex_ticker)
            fi     = ticker.fast_info
            last   = float(getattr(fi, "last_price", None) or 0)
            prev   = float(getattr(fi, "previous_close", None) or 0)

            if last == 0:
                hist = ticker.history(period="2d", interval="1d")
                if not hist.empty:
                    last = float(hist["Close"].iloc[-1])
                    prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else last

            diff = last - prev
            pct  = (diff / prev * 100) if prev else 0

            forex_rate = {
                "ticker":  forex_ticker,
                "price":   round(last, 4),
                "change":  f"{'+' if diff >= 0 else ''}{pct:.2f}%",
                "positive": diff >= 0,
            }

            # Get 1-month history for sparkline
            hist = ticker.history(period="1mo", interval="1d")
            if not hist.empty:
                hist = hist.reset_index()
                for col in hist.columns:
                    if hasattr(hist[col], 'dt'):
                        hist[col] = hist[col].dt.strftime("%Y-%m-%d")
                forex_history = hist[["Date","Open","High","Low","Close","Volume"]].dropna().to_dict(orient="records")

        except Exception as e:
            print(f"Forex fetch error for {forex_ticker}: {e}")

    return {
        "country_code": code,
        "country_name": COUNTRY_NAMES.get(code, code),
        "currency":     meta["currency"],
        "exchange":     meta["exchange"],
        "gdp":          meta["gdp"],
        "inflation":    meta["inflation"],
        "interest_rate":meta["rate"],
        "forex_ticker": forex_ticker,
        "forex_rate":   forex_rate,
        "forex_history":forex_history,
    }