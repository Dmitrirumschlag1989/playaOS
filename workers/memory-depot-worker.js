// Memory Depot routes for the existing playa-companion-api Worker.
//
// This module intentionally uses the Worker R2 binding instead of exposing
// Cloudflare credentials to the browser. It supports the existing Worker
// integration while keeping the bucket private.
//
// Preferred binding name: Memories. MEMORIES is retained as a compatibility
// fallback because the first prototype used that spelling.

const ALLOWED_ORIGINS = new Set([
  'https://dmitrirumschlag1989.github.io',
]);

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const UPLOAD_TTL_SECONDS = 15 * 60;
const PAGE_LIMIT = 50;

function bucket(env) {
  return env.Memories || env.MEMORIES || null;
}

function cors(origin) {
  const allow = ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://dmitrirumschlag1989.github.io';

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Accept,X-Upload-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...cors(origin),
    },
  });
}

function safeName(name = 'upload') {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .slice(-120);
}

function safeText(value, max) {
  return String(value || '').trim().slice(0, max);
}

function mediaKind(contentType) {
  if (/^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(contentType)) return 'image';
  if (/^video\//i.test(contentType)) return 'video';
  return null;
}

function dateParts(date = new Date()) {
  const iso = date.toISOString();
  return {
    year: iso.slice(0, 4),
    monthDay: iso.slice(5, 10),
  };
}

function memoryKey(id, contentType, date = new Date()) {
  const { year, monthDay } = dateParts(date);
  const ext = contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
  return `memories/${year}/${monthDay}/${id}.${ext}`;
}

function metaKey(id, date = new Date()) {
  const { year, monthDay } = dateParts(date);
  return `memories/${year}/${monthDay}/${id}.json`;
}

function uploadKey(token) {
  return `memories/_uploads/${token}.json`;
}

async function readJsonObject(r2, key) {
  const object = await r2.get(key);
  if (!object) return null;
  try {
    return await object.json();
  } catch (_) {
    return null;
  }
}

async function listMemories(r2, limit = PAGE_LIMIT, cursor = undefined) {
  const listed = await r2.list({
    prefix: 'memories/',
    limit: 1000,
    cursor,
  });

  const memories = [];
  for (const object of listed.objects) {
    if (!object.key.endsWith('.json') || object.key.includes('/_uploads/')) continue;
    const item = await readJsonObject(r2, object.key);
    if (item) memories.push(item);
  }

  memories.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));

  return {
    memories: memories.slice(0, limit),
    cursor: listed.truncated ? listed.cursor : null,
  };
}

export async function handleMemoryDepot(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/memories')) return null;

  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) });
  }

  const r2 = bucket(env);
  if (!r2) {
    return json({
      error: 'Memory Depot R2 binding is not configured',
      expectedBinding: 'Memories',
    }, 500, origin);
  }

  // GET /memories and GET /memories/feed
  if (request.method === 'GET' && (url.pathname === '/memories' || url.pathname === '/memories/feed')) {
    const requestedLimit = Number(url.searchParams.get('limit') || PAGE_LIMIT);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : PAGE_LIMIT, 1), PAGE_LIMIT);
    const cursor = url.searchParams.get('cursor') || undefined;
    const result = await listMemories(r2, limit, cursor);
    return json({
      memories: result.memories,
      nextCursor: result.cursor,
    }, 200, origin);
  }

  // POST /memories/upload
  // Creates a short-lived upload session. The returned uploadUrl points back
  // to the Worker so the browser never receives R2 credentials.
  if (request.method === 'POST' && url.pathname === '/memories/upload') {
    let payload = {};
    const contentType = request.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      try { payload = await request.json(); } catch (_) { return json({ error: 'Invalid JSON' }, 400, origin); }
    }

    const requestedType = safeText(payload.contentType, 120);
    const kind = mediaKind(requestedType);
    if (!kind) {
      return json({ error: 'A supported image or video contentType is required' }, 415, origin);
    }

    const id = crypto.randomUUID();
    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = Date.now() + UPLOAD_TTL_SECONDS * 1000;
    const createdAt = new Date().toISOString();

    const pending = {
      id,
      token,
      contentType: requestedType,
      kind,
      expiresAt,
      createdAt,
      metadata: {
        uploadedBy: safeText(payload.uploadedBy, 80),
        caption: safeText(payload.caption, 1000),
        eventId: safeText(payload.eventId, 120),
        eventName: safeText(payload.eventName, 200),
        location: safeText(payload.location, 160),
      },
      originalName: safeName(payload.originalName || 'upload'),
    };

    await r2.put(uploadKey(token), JSON.stringify(pending), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    });

    return json({
      id,
      uploadUrl: `${url.origin}/memories/upload/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
      method: 'PUT',
      expiresIn: UPLOAD_TTL_SECONDS,
      maxBytes: MAX_UPLOAD_BYTES,
      contentType: requestedType,
    }, 201, origin);
  }

  // PUT /memories/upload/:id
  // Binding-first upload path. It avoids exposing R2 credentials and is the
  // safe fallback when the Worker does not have R2 S3 signing credentials.
  const uploadMatch = url.pathname.match(/^\/memories\/upload\/([^/]+)$/);
  if (request.method === 'PUT' && uploadMatch) {
    const id = decodeURIComponent(uploadMatch[1]);
    const token = url.searchParams.get('token') || request.headers.get('X-Upload-Token');
    if (!token) return json({ error: 'Upload token required' }, 401, origin);

    const pending = await readJsonObject(r2, uploadKey(token));
    if (!pending || pending.id !== id) return json({ error: 'Upload session not found' }, 404, origin);
    if (Date.now() > pending.expiresAt) {
      await r2.delete(uploadKey(token));
      return json({ error: 'Upload session expired' }, 410, origin);
    }

    const requestType = request.headers.get('Content-Type') || pending.contentType;
    if (requestType !== pending.contentType) {
      return json({ error: 'Content-Type does not match upload authorization' }, 400, origin);
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength && contentLength > MAX_UPLOAD_BYTES) {
      return json({ error: 'File exceeds 100 MB limit' }, 413, origin);
    }

    const key = memoryKey(id, pending.contentType, new Date(pending.createdAt));
    await r2.put(key, request.body, {
      httpMetadata: { contentType: pending.contentType },
      customMetadata: {
        kind: pending.kind,
        original_name: pending.originalName,
      },
    });

    const uploadedAt = new Date().toISOString();
    const memory = {
      id,
      key,
      type: pending.kind,
      url: `${url.origin}/memories/${encodeURIComponent(id)}`,
      uploadedAt,
      uploadedBy: pending.metadata.uploadedBy,
      caption: pending.metadata.caption,
      eventId: pending.metadata.eventId,
      eventName: pending.metadata.eventName,
      location: pending.metadata.location,
      originalName: pending.originalName,
    };

    await r2.put(metaKey(id, new Date(pending.createdAt)), JSON.stringify(memory), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    });
    await r2.delete(uploadKey(token));

    return json(memory, 201, origin);
  }

  // GET /memories/:id
  if (request.method === 'GET') {
    const match = url.pathname.match(/^\/memories\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      const result = await listMemories(r2, 1000);
      const memory = result.memories.find((item) => item.id === id);
      if (!memory) return json({ error: 'Memory not found' }, 404, origin);
      return json(memory, 200, origin);
    }
  }

  // GET /memories/:id/content
  if (request.method === 'GET') {
    const match = url.pathname.match(/^\/memories\/([^/]+)\/content$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      const result = await listMemories(r2, 1000);
      const memory = result.memories.find((item) => item.id === id);
      if (!memory) return json({ error: 'Memory not found' }, 404, origin);
      const object = await r2.get(memory.key);
      if (!object) return json({ error: 'Memory content not found' }, 404, origin);

      const headers = new Headers(cors(origin));
      headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
      headers.set('Cache-Control', 'private, max-age=3600');
      if (object.httpEtag) headers.set('ETag', object.httpEtag);
      return new Response(object.body, { headers });
    }
  }

  // DELETE /memories/:id
  if (request.method === 'DELETE') {
    const match = url.pathname.match(/^\/memories\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      const result = await listMemories(r2, 1000);
      const memory = result.memories.find((item) => item.id === id);
      if (!memory) return json({ error: 'Memory not found' }, 404, origin);
      await r2.delete(memory.key);
      await r2.delete(memory.key.replace(/\.[^.]+$/, '.json'));
      return json({ ok: true, id }, 200, origin);
    }
  }

  return json({ error: 'Method not allowed' }, 405, origin);
}
