# Memory Depot implementation status

## Completed in this branch

- Hardened the existing Memory Depot route module.
- Supports the preferred `Memories` R2 binding with `MEMORIES` compatibility fallback.
- Keeps R2 private.
- Added `/memories/feed`.
- Added paginated list parameters.
- Added short-lived upload sessions.
- Added Worker-mediated binary upload so R2 credentials never reach the client.
- Added structured `memories/YYYY/MM-DD/` object keys.
- Added metadata records next to media objects.
- Added image/video type validation.
- Increased the application-level upload allowance to 100 MB.
- Added metadata fields for uploader, caption, event ID/name, and Playa location.
- Added CORS policy file for the existing GitHub Pages origin.
- Added deployment/integration documentation.

## Still requires Cloudflare-side verification

The repository does not contain the source of the already-deployed `playa-companion-api` Worker. The route module therefore cannot be safely deployed as a new Worker from this repository.

Before merging to production, verify in Cloudflare:

1. `playa-companion-api` exists and remains the only API Worker.
2. The existing Memories R2 bucket is private.
3. The Worker has the `Memories` R2 binding (or temporarily `MEMORIES`).
4. The route module is imported into the deployed Worker.
5. The R2 CORS policy in `workers/memories-cors.json` is applied.
6. `GET /memories` returns JSON rather than a Worker 404.
7. The upload session + PUT flow succeeds with a small test image.
8. `GET /memories` shows the uploaded record.
9. The content endpoint streams the private object through the Worker.

## Future production upgrade

When PlayaOS has user/crew authentication, enforce uploader identity and crew authorization server-side. At that point, migrate memory metadata from R2 JSON objects to D1 while retaining R2 for media.

For very large video uploads, add Worker-side generation of short-lived R2 S3 presigned PUT URLs using credentials stored only as Worker secrets. Cloudflare documents this as the direct-to-R2 path for browser uploads.
