# PlayaOS
Interactive Burning Man 2026 itinerary planner.

## Current data architecture

PlayaOS treats every Playa activity as a selectable candidate event. Selecting an event adds it to a personal itinerary; the planner will then detect overlaps, travel-time conflicts, and opportunities to split time between events.

### Data sources
- **PlayaEvents 2026:** participant-created events, reviewed/moderated before publication. The 2026 submission window closed August 22, 2026.
- **Burning Man 2026 Mutant Vehicles:** official invited-vehicle directory.
- **Burning Man 2026 Camps:** official camp directory/application dataset.
- **Burning Man GIS:** official city streets, plazas, blocks, DMZ and points-of-interest data.

The official Burning Man Innovate dataset page notes that current-year camps, art and events are available through the Burning Man API, while public PlayaEvents is the primary event-calendar source for this planner.

## Repository layout

```text
data/
  events.json       # current 2026 activity dataset
  schema.json       # activity record schema
scripts/
  import_playaevents.py
.github/workflows/
  import-playaevents.yml
```

## Activity categories

`food`, `wellness`, `workshop`, `art`, `music`, `performance`, `mutant_vehicle`, `fire`, `social`, `games`, `couples`, `costume`, `photography`, `exploration`, `service`, `other`

## Itinerary decision model

Each event will eventually support:

- Priority: Must Do / High / Maybe / Discovery
- Verified / Maybe / Rumor status
- Start and end time
- Camp/location
- Estimated travel time
- Late-arrival and early-departure tolerance
- Artist/DJ information
- Tags such as sunrise, sunset, night, couples, food, wellness, etc.

Conflict resolution will distinguish between:

1. **Hard conflicts** — impossible to attend both.
2. **Soft conflicts** — both can be partially attended.
3. **Travel conflicts** — the clock works, but Playa travel time does not.
4. **Priority conflicts** — two high-value events overlap and require a decision.
5. **Opportunity matches** — an interesting event is nearby and fits an open itinerary block.

## Data import

`import_playaevents.py` imports the approved 2026 PlayaEvents daily pages and writes a normalized JSON dataset. GitHub Actions is configured to run the importer daily and on demand.

## Next build targets

- Full 2026 PlayaEvents import
- Official 2026 camp/art/mutant-vehicle data integration
- Click-to-select activity UI
- Personal itinerary table
- Conflict-resolution engine
- Split-time recommendations
- Travel-time calculations
- Mutant Vehicle + DJ/artist layer
- Map view
- Offline/mobile-friendly planner
