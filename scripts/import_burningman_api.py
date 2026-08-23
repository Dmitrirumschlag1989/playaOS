#!/usr/bin/env python3
"""Fetch official Burning Man 2026 API data into PlayaOS.

The API key is read only from BURNING_MAN_API_KEY. Never commit the key.
The current Burning Man Public API 2.x uses endpoints such as
/api/event?year=2026 rather than the legacy /api/0.1/{year}/... paths.
"""
import json, os, sys
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = os.getenv('BURNING_MAN_API_BASE', 'https://api.burningman.org').rstrip('/')
KEY = (os.getenv('BURNING_MAN_API_KEY') or '').strip()
YEAR = int(os.getenv('BURNING_MAN_YEAR', '2026'))
OUT = Path('data/api')

if not KEY:
    print('BURNING_MAN_API_KEY is not set.', file=sys.stderr)
    sys.exit(2)

PATHS = {
    'events': os.getenv('BURNING_MAN_EVENTS_PATH', '/api/event'),
    'camps': os.getenv('BURNING_MAN_CAMPS_PATH', '/api/camp'),
    'art': os.getenv('BURNING_MAN_ART_PATH', '/api/art'),
    'mutant_vehicles': os.getenv('BURNING_MAN_MV_PATH', '/api/mv'),
}

def get(kind, path):
    url = BASE + path + '?' + urlencode({'year': YEAR})
    req = Request(url, headers={
        'X-API-Key': KEY,
        'Accept': 'application/json',
        'User-Agent': 'PlayaOS/2026',
    })
    try:
        with urlopen(req, timeout=60) as response:
            return json.load(response)
    except HTTPError as exc:
        if exc.code == 401:
            print(f'{kind}: HTTP 401 Unauthorized. The endpoint is reachable, but Burning Man rejected the API key.', file=sys.stderr)
            print('Check that the GitHub secret contains the current key issued for PlayaOS and has no extra characters.', file=sys.stderr)
        elif exc.code == 403:
            print(f'{kind}: HTTP 403 Forbidden. The key was recognized but access was denied.', file=sys.stderr)
        elif exc.code == 429:
            print(f'{kind}: HTTP 429 Rate limited. Try again later.', file=sys.stderr)
        raise
    except Exception as exc:
        print(f'{kind}: request failed: {url}: {exc}', file=sys.stderr)
        raise

OUT.mkdir(parents=True, exist_ok=True)
for kind, path in PATHS.items():
    data = get(kind, path)
    destination = OUT / f'{kind}.json'
    destination.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    count = len(data) if isinstance(data, list) else len(data.get('data', [])) if isinstance(data, dict) else '?'
    print(f'wrote {destination} ({count} records)')
