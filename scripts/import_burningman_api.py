#!/usr/bin/env python3
"""Fetch official Burning Man 2026 API data into PlayaOS.

The API key is read only from BURNING_MAN_API_KEY. Never commit the key.
The current Burning Man Public API 2.x uses query parameters such as
/api/event?year=2026 rather than the legacy /api/0.1/{year}/... paths.
"""
import json, os, sys
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = os.getenv('BURNING_MAN_API_BASE', 'https://api.burningman.org').rstrip('/')
KEY = os.getenv('BURNING_MAN_API_KEY')
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
            status = getattr(response, 'status', 200)
            if status != 200:
                raise RuntimeError(f'HTTP {status}')
            return json.load(response)
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
