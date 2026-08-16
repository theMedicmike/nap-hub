#!/usr/bin/env node
/**
 * narrate — generate real audio narration for the 12 NAP Framework documents, in one voice,
 * directly from the markdown source of truth (content/*.md).
 *
 *   GOOGLE_TTS_API_KEY=xxx node scripts/narrate.cjs --check     # what is stale/missing (no API calls, free)
 *   GOOGLE_TTS_API_KEY=xxx node scripts/narrate.cjs --stale     # (re)narrate only what drifted or is missing
 *   GOOGLE_TTS_API_KEY=xxx node scripts/narrate.cjs --all       # everything
 *   GOOGLE_TTS_API_KEY=xxx node scripts/narrate.cjs --only=manifesto
 *   node scripts/narrate.cjs --check --dry-run                  # no key needed
 *
 * Voice: en-US-Chirp3-HD-Iapetus — the same voice used for the "What Happened to Our Veterans"
 * audiobook. Keep them the same voice; it's the NAP/OWH "house voice."
 *
 * Design carried over deliberately from the book's narrate.cjs (do not simplify away):
 *  - Reads content/*.md directly (never a stale copy) so audio can never silently detach from text.
 *  - Output files are named by the doc's stable SLUG, never a position/number.
 *  - A SHA-256 hash of the exact text spoken is recorded in manifest.json. --check compares the
 *    CURRENT doc text against that hash and reports MISSING / STALE / UNVERIFIED / ok — so an edited
 *    document with stale audio is a visible, boring fact, not something a reader discovers by ear.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const OUT_DIR = path.join(__dirname, '..', 'public', 'audio');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

const VOICE_NAME = 'en-US-Chirp3-HD-Iapetus';
const LANGUAGE_CODE = 'en-US';
const MAX_CHUNK_CHARS = 2400;
const MAX_RETRIES = 3;
const CONCURRENCY = 5;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CHECK = args.includes('--check');
const DO_STALE = args.includes('--stale');
const DO_ALL = args.includes('--all');
const onlyArg = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const API_KEY = process.env.GOOGLE_TTS_API_KEY;

const hash = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

/* ---------- markdown -> the exact prose a document should speak ---------- */
// Headers are read aloud as their own short paragraph (matches the book reading chapter headings).
// Bold/italic markers, blockquote markers, and horizontal rules are stripped -- they are typography,
// not speech. Numbered/bulleted lists become individual spoken sentences (each item on its own line,
// ending in a period), exactly like the book's table-row-to-prose treatment of the bill's appropriations
// table: the alternative is Google's sentence-splitter fusing an unpunctuated list into one run-on and
// rejecting it outright.
function mdToProse(md) {
  const lines = md.split(/\r?\n/);
  const paras = [];
  let cur = [];
  const flush = () => { if (cur.length) { paras.push(cur.join(' ').trim()); cur = []; } };

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^-{3,}$/.test(line)) { flush(); continue; } // horizontal rule
    if (/^#{1,6}\s/.test(line)) {
      flush();
      const heading = line.replace(/^#{1,6}\s*/, '').replace(/[*_]/g, '').trim();
      if (heading) paras.push(heading.replace(/[.!?:]$/, '') + '.');
      continue;
    }
    let item = line;
    const isListItem = /^([-*]|\d+[.)])\s+/.test(item);
    if (isListItem) { flush(); item = item.replace(/^([-*]|\d+[.)])\s+/, ''); }
    item = item.replace(/^>\s?/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1').replace(/`(.+?)`/g, '$1').trim();
    if (!item) continue;
    if (isListItem) { paras.push(/[.!?]$/.test(item) ? item : item + '.'); continue; }
    cur.push(item);
  }
  flush();
  return paras.filter(Boolean);
}

function docText(slug) {
  const md = fs.readFileSync(path.join(CONTENT_DIR, slug + '.md'), 'utf8');
  return mdToProse(md).join('\n\n');
}

/* ---------- the work list: the 12 documents, read from lib/canon.ts's own DOCS list ---------- */
const canonSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'canon.ts'), 'utf8');
const slugMatches = [...canonSrc.matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
if (!slugMatches.length) { console.error('Could not find any doc slugs in lib/canon.ts — check the DOCS export shape.'); process.exit(1); }

const items = slugMatches.map((slug) => ({ id: slug, label: slug, text: docText(slug) }));

/* ---------- manifest ---------- */
let manifest = {};
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) { manifest = {}; }

function statusOf(it) {
  const m = manifest[it.id];
  if (!m) return 'MISSING';
  if (!m.hash) return 'UNVERIFIED';
  if (m.hash !== hash(it.text)) return 'STALE';
  return 'ok';
}

if (CHECK) {
  const groups = { MISSING: [], STALE: [], UNVERIFIED: [], ok: [] };
  items.forEach((it) => groups[statusOf(it)].push(it));
  const line = (it) => `   ${it.label}`;
  console.log(`voice: ${VOICE_NAME}`);
  console.log(`documents: ${items.length}\n`);
  console.log(`MISSING  (never narrated)      ${groups.MISSING.length}`); groups.MISSING.forEach((it) => console.log(line(it)));
  console.log(`\nSTALE    (text changed)        ${groups.STALE.length}`); groups.STALE.forEach((it) => console.log(line(it)));
  console.log(`\nUNVERIFIED (pre-hash audio)    ${groups.UNVERIFIED.length}`);
  console.log(`ok                             ${groups.ok.length}`);
  const todo = groups.MISSING.length + groups.STALE.length + groups.UNVERIFIED.length;
  const chars = items.filter((it) => statusOf(it) !== 'ok').reduce((n, it) => n + it.text.length, 0);
  console.log(`\nwould narrate: ${todo} documents, ~${chars.toLocaleString()} characters`);
  process.exit(0);
}

let todo;
if (onlyArg) todo = items.filter((it) => it.id === onlyArg);
else if (DO_ALL) todo = items.slice();
else if (DO_STALE) todo = items.filter((it) => statusOf(it) !== 'ok');
else { console.error('Pick a mode: --check | --stale | --all | --only=<slug>'); process.exit(1); }
if (!todo.length) { console.log('nothing to do'); process.exit(0); }
if (!DRY_RUN && !API_KEY) { console.error('GOOGLE_TTS_API_KEY is not set. Set it in the environment; it is not read from any file.'); process.exit(1); }

/* ---------- chunking, carried over verbatim from the book's narrate.cjs (Google TTS limits) ---------- */
const TTS_SENTENCE_LIMIT = 560;
const TTS_MIN_PIECE = 40;

function splitLongSentence(s) {
  s = s.trim();
  if (s.length <= TTS_SENTENCE_LIMIT) return s;
  const pieces = [];
  let rest = s;
  while (rest.length > TTS_SENTENCE_LIMIT) {
    const window = rest.slice(0, TTS_SENTENCE_LIMIT);
    let cut = -1;
    for (const rx of [/;\s(?=\S)/g, /\s—\s(?=\S)/g, /,\s(?=and\s|or\s|but\s)/g, /,\s(?=\S)/g]) {
      let m, last = -1;
      while ((m = rx.exec(window))) last = m.index + m[0].length;
      if (last > TTS_MIN_PIECE) { cut = last; break; }
    }
    if (cut === -1) {
      const sp = window.lastIndexOf(' ');
      if (sp > TTS_MIN_PIECE) cut = sp + 1; else break;
    }
    const head = rest.slice(0, cut).trim().replace(/[\s,;—]+$/, '');
    const tail = rest.slice(cut).trim();
    if (head.length < TTS_MIN_PIECE) break;
    pieces.push(/[.!?]$/.test(head) ? head : head + '.');
    rest = tail;
  }
  pieces.push(/[.!?]$/.test(rest) ? rest : rest + '.');
  return pieces.join(' ');
}

const ABBREV_END = /(?:\b[A-Z]\.|\bU\.S\.|\bet al\.|\bDr\.|\bMr\.|\bMrs\.|\bMs\.|\bSt\.|\bNo\.|\bvs\.|\bInc\.|\bLtd\.|\bCo\.|\bEds?\.|\bVol\.|\bpp\.|\bFig\.|\bapprox\.)$/;

function enforceSentenceLimits(text) {
  const raw = text.split(/(?<=[.!?])\s+/);
  const merged = [];
  for (const frag of raw) {
    if (merged.length && ABBREV_END.test(merged[merged.length - 1].trim())) merged[merged.length - 1] += ' ' + frag;
    else merged.push(frag);
  }
  return merged.map(splitLongSentence).join(' ');
}
function chunkText(raw) {
  const paras = raw.split(/\r?\n\r?\n/).map((p) => p.replace(/\r?\n/g, ' ').trim()).filter(Boolean);
  const prose = paras.map((p) => (/[.!?]$/.test(p) ? p : p.replace(/[,;:—\-]\s*$/, '') + '.'));
  const chunks = [];
  let cur = '';
  for (const p of prose) {
    const candidate = cur ? cur + '\n\n' + p : p;
    if (candidate.length > MAX_CHUNK_CHARS && cur) { chunks.push(cur); cur = p; } else { cur = candidate; }
  }
  if (cur) chunks.push(cur);
  return chunks.map(enforceSentenceLimits);
}

async function ttsRequest(text, attempt) {
  attempt = attempt || 1;
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: LANGUAGE_CODE, name: VOICE_NAME }, audioConfig: { audioEncoding: 'MP3' } }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.audioContent) return Buffer.from(data.audioContent, 'base64');
  if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
    const wait = attempt * 2000;
    console.log(`  retryable ${res.status}, waiting ${wait}ms (${attempt}/${MAX_RETRIES})`);
    await new Promise((r) => setTimeout(r, wait));
    return ttsRequest(text, attempt + 1);
  }
  throw new Error('Google TTS failed: ' + res.status + ' ' + JSON.stringify(data).slice(0, 300));
}

async function pool(list, limit, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (i < list.length) { const n = i++; await worker(list[n], n); }
  });
  await Promise.all(runners);
}

(async () => {
  if (!DRY_RUN) fs.mkdirSync(OUT_DIR, { recursive: true });
  const totalChars = todo.reduce((n, it) => n + it.text.length, 0);
  console.log(`voice ${VOICE_NAME} | ${todo.length} document(s) | ~${totalChars.toLocaleString()} chars${DRY_RUN ? ' | DRY RUN' : ''}\n`);
  let done = 0;
  for (const it of todo) {
    const chunks = chunkText(it.text);
    process.stdout.write(`${it.label} — ${chunks.length} chunk(s) ... `);
    if (DRY_RUN) { console.log('(dry run)'); done++; continue; }

    const prev = (manifest[it.id] && manifest[it.id].chunks) || 0;
    for (let i = chunks.length; i < prev; i++) {
      const f = path.join(OUT_DIR, `${it.id}-${i}.mp3`);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }

    await pool(chunks, CONCURRENCY, async (chunk, idx) => {
      const buf = await ttsRequest(chunk);
      fs.writeFileSync(path.join(OUT_DIR, `${it.id}-${idx}.mp3`), buf);
    });

    manifest[it.id] = { chunks: chunks.length, hash: hash(it.text), voice: VOICE_NAME };
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0));
    console.log('done');
    done++;
  }
  console.log(`\n${done}/${todo.length} narrated. manifest updated.`);
  console.log('Audio files are in public/audio/ — commit + push to deploy them.');
})().catch((e) => { console.error('\nFATAL: ' + e.message); process.exit(1); });
