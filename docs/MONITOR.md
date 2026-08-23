# PlayaOS Live Monitor

PlayaOS should treat the published dataset as a starting point, not ground truth forever. During the event, participants can report corrections and field observations as conditions change.

## Report types

- schedule_change
- cancellation
- location_change
- dj_update
- artist_update
- new_event
- correction
- rumor
- field_report
- other

## Trust model

Reports are never silently promoted to verified truth. Every report has a source type, evidence, timestamp, confidence, and moderation status.

Suggested flow:

1. Participant submits a report from an activity card or Monitor page.
2. PlayaOS records the report with the original event snapshot.
3. The report enters `pending` status.
4. Corroborating reports, official/camp sources, or repeated field reports increase confidence.
5. Accepted changes create a new event revision while preserving the original record and audit trail.
6. The UI displays a visible freshness badge such as `Verified`, `Updated 12 min ago`, `Field report`, or `Unconfirmed`.

## Conflict behavior

A recently reported cancellation should immediately remove an event from recommendations while preserving it in the history. A reported location change should recalculate travel conflicts. Schedule changes should re-run all itinerary conflicts.

## Important privacy rule

Do not require a real name. A participant may submit anonymously or with an optional display name. Do not expose email addresses or other private information in the public dataset.

## Data provenance

Official Burning Man API data remains authoritative where available. PlayaEvents supplies participant event information. Community reports provide a live operational layer and must remain distinguishable from official data.
