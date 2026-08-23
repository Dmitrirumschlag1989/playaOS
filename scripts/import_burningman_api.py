#!/usr/bin/env python3
"""Fetch official Burning Man 2026 API data into the normalized PlayaOS dataset.

The API key is read only from BURNING_MAN_API_KEY. Never commit the key.
Endpoint paths can be overridden with BURNING_MAN_API_BASE and the *_PATH env vars
because Burning Man can change API versions/paths without changing the app.
"""
import json, os, sys
from pathlib import Path
from urllib.request import Request, urlopen

BASE=os.getenv('BURNING_MAN_API_BASE','https://api.burningman.org').rstrip('/')
KEY=os.getenv('BURNING_MAN_API_KEY')
YEAR=os.getenv('BURNING_MAN_YEAR','2026')
PATHS={
 'events':os.getenv('BURNING_MAN_EVENTS_PATH',f'/api/0.1/{YEAR}/event/'),
 'camps':os.getenv('BURNING_MAN_CAMPS_PATH',f'/api/0.1/{YEAR}/camp/'),
 'art':os.getenv('BURNING_MAN_ART_PATH',f'/api/0.1/{YEAR}/art/'),
}
OUT=Path('data/api')
if not KEY:
 print('BURNING_MAN_API_KEY is not set; skipping API import.',file=sys.stderr); sys.exit(2)

def get(kind,path):
 url=BASE+path
 req=Request(url,headers={'X-API-Key':KEY,'Accept':'application/json','User-Agent':'PlayaOS/2026'})
 try:
  with urlopen(req,timeout=30) as r: return json.load(r)
 except Exception as e:
  print(f'{kind}: {url}: {e}',file=sys.stderr); raise

OUT.mkdir(parents=True,exist_ok=True)
for kind,path in PATHS.items():
 data=get(kind,path)
 (OUT/f'{kind}.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
 print(f'wrote {kind}.json')
