# PlayaOS Worker modules

## Memory Depot

`memory-depot-worker.js` contains the Memory Depot route handler for the existing `playa-companion-api` Worker.

It is **not** a standalone Worker and must be imported into the deployed API Worker.

See:

- `workers/memory-depot-integration.md`
- `docs/memory-depot-cloudflare.md`
- `docs/memory-depot-status.md`
