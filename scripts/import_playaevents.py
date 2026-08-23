#!/usr/bin/env python3
"""Import approved 2026 PlayaEvents pages into PlayaOS JSON.

Source: https://playaevents.burningman.org/2026/playa_events/01/ ... /07/
The importer intentionally stores source_url and status=verified. Location and
richer metadata can be joined later from official Burning Man datasets/API.
"""
import json, re, hashlib
from pathlib import Path
from datetime import datetime
import requests
from bs4 import BeautifulSoup

BASE = "https://playaevents.burningman.org/2026/playa_events/{:02d}/"
OUT = Path(__file__).resolve().parents[1] / "data" / "events.json"
CATEGORIES = {
    "breakfast":"food", "coffee":"food", "tea":"food", "taco":"food", "pizza":"food", "waffle":"food", "pancake":"food", "ramen":"food", "food":"food", "drink":"food", "cocktail":"food", "bar":"social",
    "yoga":"wellness", "massage":"wellness", "meditation":"wellness", "breathwork":"wellness", "healing":"wellness", "sound bath":"wellness", "qigong":"wellness", "spa":"wellness", "reiki":"wellness",
    "workshop":"workshop", "craft":"workshop", "make-n-take":"workshop", "painting":"workshop", "leather":"workshop", "poi":"workshop", "dance lesson":"workshop",
    "art":"art", "gallery":"art", "installation":"art", "light":"art", "museum":"art",
    "dj":"music", "music":"music", "disco":"music", "house":"music", "techno":"music", "bass":"music", "concert":"music", "jam":"music", "karaoke":"music", "sound system":"music",
    "performance":"performance", "cabaret":"performance", "comedy":"performance", "stand-up":"performance", "theater":"performance", "circus":"performance", "burlesque":"performance", "clown":"performance",
    "artcar":"mutant_vehicle", "art car":"mutant_vehicle", "mutant vehicle":"mutant_vehicle", "ride":"mutant_vehicle", "vehicle":"mutant_vehicle",
    "fire":"fire", "flame":"fire", "burn":"fire",
    "game":"games", "golf":"games", "pickleball":"games", "trivia":"games", "race":"games", "joust":"games",
    "costume":"costume", "fashion":"costume", "body paint":"costume",
    "couples":"couples", "intimate":"couples", "sensual":"couples", "tantric":"couples", "massage circle":"couples",
    "bike":"exploration", "tour":"exploration", "parade":"exploration", "scavenger":"exploration"
}

def category(title, camp):
    text = (title + " " + camp).lower()
    for key, value in CATEGORIES.items():
        if key in text:
            return value
    return "other"

def parse_time_range(text):
    m = re.search(r'\((\d{1,2}(?::\d{2})?\s*[AP]M)\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*[AP]M)\)', text, re.I)
    if not m:
        return None
    def norm(s):
        s=s.upper().replace(' ','')
        if ':' not in s: s=s.replace('AM',':00AM').replace('PM',':00PM')
        return datetime.strptime(s, '%I:%M%p').strftime('%H:%M')
    return norm(m.group(1)), norm(m.group(2))

def parse_page(day_index):
    url = BASE.format(day_index)
    html = requests.get(url, timeout=30, headers={'User-Agent':'PlayaOS/1.0'}).text
    soup = BeautifulSoup(html, 'html.parser')
    heading = soup.find(['h2','h3'], string=re.compile(r'Events for', re.I))
    if not heading:
        return []
    mday = re.search(r'(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s+([A-Za-z]+\.?)\s+(\d{1,2}),\s+(\d{4})', heading.get_text(' ', strip=True))
    if not mday:
        return []
    date = datetime.strptime(f'{mday.group(2)} {mday.group(3)} {mday.group(4)}','%b %d %Y').strftime('%Y-%m-%d')
    events=[]
    for node in heading.find_all_next(['li','p']):
        txt=node.get_text(' ', strip=True)
        tr=parse_time_range(txt)
        if not tr: continue
        # Expected rendered form: Title(start – end) Camp
        before, after = txt.split('(',1)
        title = before.strip(' •')
        camp = after.split(')',1)[1].strip(' •') if ')' in after else ''
        if not title or len(title)>160: continue
        eid='pe-'+date+'-'+hashlib.sha1((title+'|'+camp+'|'+tr[0]+'|'+tr[1]).encode()).hexdigest()[:10]
        overnight = tr[1] < tr[0]
        events.append({'id':eid,'date':date,'start':tr[0],'end':tr[1],'title':title,'camp':camp,'category':category(title,camp),'priority':'maybe','status':'verified','source_url':url, 'overnight':overnight})
    return events

def main():
    all_events=[]
    for day in range(1,8):
        all_events.extend(parse_page(day))
    # Deduplicate by stable id, then sort chronologically.
    unique={e['id']:e for e in all_events}
    result={'schema_version':'1.0.0','event_year':2026,'event_name':'Axis Mundi','source':'https://playaevents.burningman.org/','source_status':'imported','updated_at':datetime.utcnow().isoformat(timespec='seconds')+'Z','events':sorted(unique.values(), key=lambda e:(e['date'],e['start'],e['title']))}
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False)+'\n')
    print(f'Imported {len(result["events"])} events into {OUT}')

if __name__ == '__main__': main()
