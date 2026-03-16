COUNTRY_INDEX_MAP = {
    "IN": "^NSEI",        # NIFTY 50 - India
    "US": "^GSPC",        # S&P 500 - USA
    "DE": "^GDAXI",       # DAX - Germany
    "JP": "^N225",        # Nikkei 225 - Japan
    "GB": "^FTSE",        # FTSE 100 - UK
    "CN": "000001.SS",    # Shanghai Composite - China
    "BR": "^BVSP",        # Bovespa - Brazil
    "FR": "^FCHI",        # CAC 40 - France
    "KR": "^KS11",        # KOSPI - South Korea
    "AU": "^AXJO",        # ASX 200 - Australia
    "CA": "^GSPTSE",      # TSX - Canada
    "HK": "^HSI",         # Hang Seng - Hong Kong
    "RU": "ERUS",         # iShares MSCI Russia ETF (RSX delisted 2022)
    "SA": "^TASI.SR",     # Tadawul - Saudi Arabia
    "ZA": "EZA",          # iShares MSCI South Africa ETF
    "MX": "^MXX",         # IPC - Mexico
    "SG": "^STI",         # STI - Singapore
    "IT": "FTSEMIB.MI",   # FTSE MIB - Italy
    "ES": "^IBEX",        # IBEX 35 - Spain
    "NL": "^AEX",         # AEX - Netherlands
    "SE": "^OMX",         # OMX Stockholm - Sweden
    "CH": "^SSMI",        # SMI - Switzerland
    "NO": "OBX.OL",       # OBX - Norway
    "TR": "XU100.IS",     # BIST 100 - Turkey
    "ID": "^JKSE",        # IDX Composite - Indonesia
    "TH": "^SET.BK",      # SET - Thailand
    "MY": "^KLSE",        # KLCI - Malaysia
    "PH": "PSEi.PS",      # PSEi - Philippines
    "PK": "^KSE",         # KSE 100 - Pakistan
    "EG": "EGPT",         # VanEck Egypt ETF
    "NG": "NGE",          # Global X Nigeria ETF
    "AR": "^MERV",        # Merval - Argentina
    "CL": "ECH",          # iShares MSCI Chile ETF
    "CO": "GXG",          # Global X Colombia ETF
    "NZ": "^NZ50",        # NZX 50 - New Zealand
    "IL": "^TA125.TA",    # TA-125 - Israel
    "QA": "QAT",          # iShares MSCI Qatar ETF
    "AE": "^DFMGI",       # DFM General Index - UAE
    "VN": "VNM",          # VanEck Vietnam ETF
    "TW": "^TWII",        # TAIEX - Taiwan
}

# ── Futures: only tickers confirmed working on yfinance as of 2026 ────────────
COUNTRY_FUTURES_MAP = {
    "US": ["ES=F", "NQ=F", "YM=F"],  # S&P 500, Nasdaq, Dow continuous futures
    "DE": ["FDAX=F"],                 # DAX continuous futures
    "JP": ["NK=F"],                   # Nikkei 225 continuous futures
    "GB": ["Z=F"],                    # FTSE 100 continuous futures
    "FR": ["FCE=F"],                  # CAC 40 continuous futures
    "CN": ["CN=F"],                   # China A50 continuous futures
    # AU: AP=F delisted — falls back to EWA ETF via market.py fallback
    # CA: SXF=F unreliable — falls back to EWC ETF
    # IN: dated contracts expire — falls back to INDY ETF
    # BR: WIN=F unreliable outside Brazil — falls back to EWZ ETF
    # RU: IMOEX sanctioned, RSX delisted — falls back to ERUS ETF
}

# ── ETF proxies for options (options only trade on ETFs, not indices) ──────────
ETF_PROXY = {
    "US": "SPY",  "IN": "INDY", "DE": "EWG",  "JP": "EWJ",
    "GB": "EWU",  "CN": "FXI",  "BR": "EWZ",  "KR": "EWY",
    "AU": "EWA",  "FR": "EWQ",  "CA": "EWC",  "IT": "EWI",
    "ES": "EWP",  "NL": "EWN",  "SE": "EWD",  "CH": "EWL",
    "MX": "EWW",  "SA": "KSA",  "ZA": "EZA",  "SG": "EWS",
    "TH": "THD",  "MY": "EWM",  "ID": "EIDO", "PH": "EPHE",
    "TR": "TUR",  "HK": "EWH",  "TW": "EWT",  "AR": "ARGT",
    "CL": "ECH",  "CO": "GXG",  "IL": "EIS",  "NG": "NGE",
    "EG": "EGPT", "VN": "VNM",  "PK": "PAK",  "QA": "QAT",
    "RU": "ERUS",                # iShares MSCI Russia (still trades, reflects sanctions)
    "NZ": "ENZL", "NO": "ENOR",
}

COUNTRY_FUNDS_MAP = {
    "US": ["SPY", "QQQ", "IWM", "VTI", "VOO"],
    "IN": ["INDA", "INDY", "SMIN"],
    "DE": ["EWG", "DBGR"],
    "JP": ["EWJ", "DXJ"],
    "GB": ["EWU", "FKU"],
    "CN": ["FXI", "MCHI", "KWEB"],
    "BR": ["EWZ", "BRZU"],
    "KR": ["EWY", "FLKR"],
    "AU": ["EWA", "FLAU"],
    "FR": ["EWQ"],
    "CA": ["EWC"],
    "HK": ["EWH"],
    "MX": ["EWW"],
    "IT": ["EWI"],
    "ES": ["EWP"],
    "NL": ["EWN"],
    "SE": ["EWD"],
    "CH": ["EWL"],
    "SG": ["EWS"],
    "SA": ["KSA"],
    "ZA": ["EZA"],
    "TR": ["TUR"],
    "TH": ["THD"],
    "MY": ["EWM"],
    "ID": ["EIDO"],
    "PH": ["EPHE"],
    "AR": ["ARGT"],
    "CL": ["ECH"],
    "CO": ["GXG"],
    "IL": ["EIS"],
    "QA": ["QAT"],
    "VN": ["VNM"],
    "NG": ["NGE"],
    "EG": ["EGPT"],
    "PK": ["PAK"],
    "RU": ["ERUS"],              # iShares MSCI Russia — still tradeable
    "NZ": ["ENZL"],
    "NO": ["ENOR"],
    "TW": ["EWT"],
}

COUNTRY_NAMES = {
    "IN": "India",         "US": "United States", "DE": "Germany",
    "JP": "Japan",         "GB": "United Kingdom","CN": "China",
    "BR": "Brazil",        "FR": "France",        "KR": "South Korea",
    "AU": "Australia",     "CA": "Canada",        "HK": "Hong Kong",
    "RU": "Russia",        "SA": "Saudi Arabia",  "ZA": "South Africa",
    "MX": "Mexico",        "SG": "Singapore",     "IT": "Italy",
    "ES": "Spain",         "NL": "Netherlands",   "SE": "Sweden",
    "CH": "Switzerland",   "NO": "Norway",        "TR": "Turkey",
    "ID": "Indonesia",     "TH": "Thailand",      "MY": "Malaysia",
    "PH": "Philippines",   "PK": "Pakistan",      "EG": "Egypt",
    "NG": "Nigeria",       "AR": "Argentina",     "CL": "Chile",
    "CO": "Colombia",      "NZ": "New Zealand",   "IL": "Israel",
    "QA": "Qatar",         "AE": "UAE",           "VN": "Vietnam",
    "TW": "Taiwan",
}