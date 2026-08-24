# Memory Depot implementation status

Memory Depot is connected to the live `playa-companion-api` Worker and private `Memories` R2 bucket.

## Current slice

- Private R2 bucket: `playa-companion-memories`.
- Worker binding: `Memories`.
- Live API: `GET /memories`, `GET /memories/feed`, upload-session flow, content delivery, and delete.
- Frontend upload flow uses the Worker upload session and never receives R2 credentials.
- Media keys use `memories/YYYY/MM-DD/<id>.<ext>`.
- Metadata includes uploader, caption, day, event, and location.

## Next

- Test a real iPhone image through the UI.
- Add authentication/crew authorization.
- Move searchable metadata into D1 while keeping R2 as the media store.
- Add direct-to-R2 presigned uploads for large video using Worker-only secrets.
