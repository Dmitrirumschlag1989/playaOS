# Memory Depot — Cloudflare integration

Memory Depot uses the existing `playa-companion-api` Worker as the application/security layer in front of a private R2 bucket.

## Architecture

```text
PlayaOS (GitHub Pages)
        |
        v
playa-companion-api Worker
        |
        v
R2 binding: Memories
        |
        +-- memories/YYYY/MM-DD/<id>.<ext>
        +-- memories/YYYY/MM-DD/<id>.json
        +-- memories/_uploads/<short-lived-session>.json
```

The browser never receives Cloudflare API credentials or R2 access keys.

## Required Cloudflare configuration

### Worker

Existing Worker:

`playa-companion-api`

The Worker must have an R2 binding whose JavaScript binding name is:

`Memories`

The route module also accepts `MEMORIES` as a backwards-compatible fallback because the original prototype used that name.

### R2 bucket

Keep the `Memories` bucket private. Do not enable the R2 public development URL for this feature.

### CORS

Apply `workers/memories-cors.json` to the existing Memories bucket. Cloudflare's current R2 documentation requires an appropriate CORS policy for browser-based access to R2, including presigned URL workflows. This Worker currently uses the binding-first upload path, so the same policy is safe to keep in place for future direct-to-R2 uploads.

## API

### `GET /memories`

Returns recent memories, newest first.

Optional query parameters:

- `limit` — 1–50
- `cursor` — R2 pagination cursor

### `GET /memories/feed`

Same data contract as `/memories`; reserved as the feed-specific API surface for future ranking/filtering.

### `POST /memories/upload`

Creates a short-lived upload session. Send JSON such as:

```json
{
  "contentType": "image/jpeg",
  "originalName": "playa.jpg",
  "uploadedBy": "Dmitri",
  "caption": "What a night.",
  "eventId": "event-123",
  "eventName": "Booty Hour",
  "location": "6&E"
}
```

The response contains a temporary Worker upload URL and an upload ID. The browser then sends the binary body with `PUT` to that URL using the authorized content type.

This binding-first path is deliberately used until the deployed Worker has a dedicated R2 S3 credential pair for generating true direct-to-R2 presigned URLs. Cloudflare documents presigned PUT URLs as the mechanism for bypassing the Worker for large uploads; those credentials belong only in Worker secrets and must never be shipped to the browser.

### `GET /memories/:id`

Returns memory metadata.

### `GET /memories/:id/content`

Streams the private object through the Worker.

### `DELETE /memories/:id`

Deletes both the media object and its metadata object.

## Metadata contract

```json
{
  "id": "abc123",
  "key": "memories/2026/08-30/abc123.jpg",
  "type": "image",
  "url": "https://playa-companion-api.dmitrirumschlag1989.workers.dev/memories/abc123",
  "uploadedAt": "2026-08-30T18:00:00.000Z",
  "uploadedBy": "Dmitri",
  "caption": "What a night.",
  "eventId": "event-123",
  "eventName": "Booty Hour",
  "location": "6&E",
  "originalName": "playa.jpg"
}
```

## Important deployment note

`workers/memory-depot-worker.js` is a route module. It must be imported into the deployed `playa-companion-api` Worker and its `handleMemoryDepot(request, env)` function must run before the existing fallback/404 handler.

Do not deploy this module as a second Worker.

## Verification checklist

After deployment, test:

```text
GET  https://playa-companion-api.dmitrirumschlag1989.workers.dev/memories
GET  https://playa-companion-api.dmitrirumschlag1989.workers.dev/memories/feed
POST https://playa-companion-api.dmitrirumschlag1989.workers.dev/memories/upload
```

For the upload test, first create an upload session, then PUT a small image to the returned upload URL, then verify `/memories` contains the resulting record.

## Future upgrade

Once user/crew authentication exists, bind `uploadedBy` and crew membership to the authenticated identity rather than trusting client-provided metadata. At that point the metadata objects can be migrated into D1 while R2 remains the media store.
