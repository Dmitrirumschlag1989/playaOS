# Integrating Memory Depot into playa-companion-api

`memory-depot-worker.js` is intentionally a route module rather than a standalone Worker.

In the deployed `playa-companion-api` Worker, import the module and route `/memories` requests before the existing fallback handler.

Conceptually:

```js
import { handleMemoryDepot } from './memory-depot-worker.js';

export default {
  async fetch(request, env, ctx) {
    const memoryResponse = await handleMemoryDepot(request, env);
    if (memoryResponse) return memoryResponse;

    // Existing PlayaOS / Burning Man API routing continues here.
    return existingHandler(request, env, ctx);
  },
};
```

If the deployed Worker already has a router, call `handleMemoryDepot()` from that router instead of replacing the existing handler.

## R2 binding

The preferred binding name is `Memories`:

```jsonc
{
  "r2_buckets": [
    {
      "binding": "Memories",
      "bucket_name": "<EXISTING_MEMORIES_BUCKET_NAME>"
    }
  ]
}
```

Do not create a second bucket. Use the existing Memories bucket and keep it private.

The route module also accepts `MEMORIES` as a compatibility fallback while the Cloudflare binding is being normalized.

## Direct-to-R2 upgrade

The current implementation uses the Worker R2 binding for uploads so no R2 credentials are exposed to the browser. Cloudflare's current R2 documentation supports presigned PUT URLs for direct browser-to-R2 uploads, but generating those URLs requires R2 S3 credentials. If we later enable that optimization, store those credentials as Worker secrets and have `/memories/upload` return only the short-lived signed URL. Never put those credentials in GitHub or frontend code.
