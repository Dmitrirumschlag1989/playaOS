const $ = (s) => document.querySelector(s);
const days = ['2026-08-30','2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05'];
let pending = [];
let memories = [];
const API = window.PLAYA_API;

function fmtDay(day) { return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }); }
function esc(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[char])); }
function normalizeMemory(memory) { return { ...memory, kind: memory.type === 'video' ? 'video' : 'photo', author: memory.uploadedBy || memory.author || 'Anonymous', day: memory.day || '', event: memory.eventName || memory.event || '', sync:'cloud' }; }
function contentUrl(memory) { return memory.contentUrl || (API && memory.id ? `${API.base}/memories/${encodeURIComponent(memory.id)}/content` : memory.url || ''); }

function render() {
  const query = $('#memorySearch').value.toLowerCase();
  const selectedDay = $('#memoryDay').value;
  const selectedKind = $('#memoryKind').value;
  const filtered = memories.filter((memory) => {
    const matchesDay = selectedDay === 'all' || memory.day === selectedDay;
    const matchesKind = selectedKind === 'all' || memory.kind === selectedKind;
    const haystack = `${memory.author} ${memory.caption} ${memory.location} ${memory.event}`.toLowerCase();
    return matchesDay && matchesKind && (!query || haystack.includes(query));
  });

  $('#memoryGrid').innerHTML = filtered.length ? filtered.map((memory) => {
    const src = contentUrl(memory);
    const media = memory.kind === 'photo' && src
      ? `<img src="${esc(src)}" alt="${esc(memory.caption || 'Playa memory')}" loading="lazy">`
      : memory.kind === 'video' && src
        ? `<video src="${esc(src)}" controls preload="metadata"></video>`
        : `<div class="memoryNote">✦<br><small>PLAYA NOTE</small></div>`;
    return `<article class="memoryCard card"><div class="memoryMedia">${media}</div><div class="memoryInfo"><strong>${esc(memory.caption || 'Untitled memory')}</strong><div class="meta">${esc(memory.author)}${memory.day ? ` · ${fmtDay(memory.day)}` : ''}</div>${memory.location ? `<div class="meta">📍 ${esc(memory.location)}</div>` : ''}${memory.event ? `<span class="tag">${esc(memory.event)}</span>` : ''}<span class="tag">☁ shared</span></div></article>`;
  }).join('') : '<div class="card emptyMemory">No memories yet. Be the first one in.</div>';
}

function populate() {
  const options = days.map((day) => `<option value="${day}">${fmtDay(day)}</option>`).join('');
  $('#memoryDay').innerHTML = '<option value="all">All days</option>' + options;
  $('#memoryDayForm').insertAdjacentHTML('beforeend', options);
}

function openFiles(files) {
  pending = [...files];
  if (!pending.length) return;
  $('#preview').innerHTML = pending.map((file) => file.type.startsWith('image/') ? `<img class="previewImg" src="${URL.createObjectURL(file)}" alt="Preview">` : `<div class="card">🎥 ${esc(file.name)}</div>`).join('');
  $('#memoryDialog').showModal();
}

async function loadCloud() {
  if (!API) return;
  try {
    const response = await API.request('/memories/feed', { cache:'no-store' });
    const data = await response.json();
    memories = Array.isArray(data.memories) ? data.memories.map(normalizeMemory) : [];
    render();
  } catch (error) {
    console.warn('Memory Depot cloud load unavailable', error);
    memories = [];
    render();
  }
}

async function uploadCloud(file, metadata) {
  if (!API) throw new Error('Cloud API is not configured.');
  const sessionResponse = await API.request('/memories/upload', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({ contentType:file.type, originalName:file.name, ...metadata }),
  });
  const session = await sessionResponse.json();
  if (!session.uploadUrl) throw new Error('The API did not return an upload URL.');
  if (file.size > session.maxBytes) throw new Error(`${file.name} exceeds the ${Math.round(session.maxBytes / 1024 / 1024)} MB upload limit.`);

  const uploadResponse = await fetch(session.uploadUrl, {
    method:'PUT',
    headers:{ 'Content-Type':file.type },
    body:file,
  });
  if (!uploadResponse.ok) {
    let detail = `HTTP ${uploadResponse.status}`;
    try { const body = await uploadResponse.json(); detail = body.error || detail; } catch (_) {}
    throw new Error(`Upload failed: ${detail}`);
  }
  return uploadResponse.json();
}

async function submit(event) {
  event.preventDefault();
  const uploadedBy = $('#memoryAuthor').value.trim();
  if (!uploadedBy || !pending.length) return;

  const metadata = {
    uploadedBy,
    caption: $('#memoryCaption').value.trim(),
    day: $('#memoryDayForm').value,
    location: $('#memoryLocation').value.trim(),
    eventName: $('#memoryEvent').value.trim(),
  };

  const button = event.target.querySelector('button.primary');
  button.disabled = true;
  button.textContent = 'Uploading…';

  try {
    for (const file of pending) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) throw new Error(`${file.name} is not a supported image or video.`);
      const uploaded = await uploadCloud(file, metadata);
      memories.unshift(normalizeMemory(uploaded));
    }
    pending = [];
    $('#memoryDialog').close();
    event.target.reset();
    render();
  } catch (error) {
    alert(`Memory Depot could not upload this item yet.\n\n${error.message}\n\nYour files were not discarded.`);
  } finally {
    button.disabled = false;
    button.textContent = 'Add to depot';
  }
}

$('#files').addEventListener('change', (event) => openFiles(event.target.files));
$('#cancelMemory').onclick = () => { $('#memoryDialog').close(); pending = []; };
$('#memoryForm').addEventListener('submit', submit);
['memorySearch','memoryDay','memoryKind'].forEach((id) => $('#' + id).addEventListener('input', render));
populate();
render();
loadCloud();
