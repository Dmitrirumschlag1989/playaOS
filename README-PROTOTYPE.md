# PlayaOS prototype

This branch is a deliberately rough, dependency-free mobile prototype for rapid testing before the Burning Man API key arrives.

## Test locally

Serve the `app/` directory with any local static server (service workers require HTTP/HTTPS):

`python3 -m http.server 8080 --directory app`

Then open `http://localhost:8080` on the phone or computer.

## Prototype features

- Search/filter activities
- Day/category browsing
- Add/remove activities
- Personal itinerary
- Basic overlap conflict detection
- Local Monitor reports
- Offline service worker
- LocalStorage persistence

The current events are deliberately demo records. They will be replaced by the normalized 2026 data pipeline once official/API and expanded PlayaEvents data are available.