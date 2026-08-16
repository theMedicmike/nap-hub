"use client";
import { useEffect, useRef, useState } from "react";

// The NAP "Listen" feature — ported from the "What Happened to Our Veterans" audiobook system.
// Two engines: RealNarrator plays real pre-generated Google Cloud TTS audio (voice
// en-US-Chirp3-HD-Iapetus) with read-along highlighting, resume position, and speed control.
// Narrator is the free browser-voice fallback, used automatically for any document that hasn't
// been narrated yet (or if generation hasn't run), so the feature is never simply absent.

const RATE_VALUES = [0.85, 1, 1.15, 1.3, 1.5, 1.75, 2];
const CHARS_PER_SEC_ESTIMATE = 14.5; // fallback when a browser reports audio.duration as Infinity/NaN

function posKey(id: string) { return `listenPos:${id}`; }
function savePos(id: string, chunk: number, time: number) {
  try { localStorage.setItem(posKey(id), JSON.stringify({ c: chunk, t: time })); } catch {}
}
function loadPos(id: string): { c: number; t: number } | null {
  try {
    const raw = localStorage.getItem(posKey(id));
    if (!raw) return null;
    const o = JSON.parse(raw);
    return typeof o.c === "number" ? o : null;
  } catch { return null; }
}
function clearPos(id: string) { try { localStorage.removeItem(posKey(id)); } catch {} }
function ratePref(): number {
  try { const r = parseFloat(localStorage.getItem("listenRate") || ""); return r && r > 0 ? r : 1; } catch { return 1; }
}
function setRatePref(r: number) { try { localStorage.setItem("listenRate", String(r)); } catch {} }

function groupParas(texts: string[], MAX: number) {
  const groups: { idx: number[]; lens: number[]; total: number }[] = [];
  let cur: number[] = [], lens: number[] = [], curLen = 0;
  for (let i = 0; i < texts.length; i++) {
    const pl = texts[i].length;
    const cand = cur.length ? curLen + 2 + pl : pl;
    if (cand > MAX && cur.length) { groups.push({ idx: cur, lens, total: curLen }); cur = [i]; lens = [pl]; curLen = pl; }
    else { cur.push(i); lens.push(pl); curLen = cand; }
  }
  if (cur.length) groups.push({ idx: cur, lens, total: curLen });
  return groups;
}
function paraAtLocal(g: { idx: number[]; lens: number[]; total: number }, frac: number) {
  let pos = frac * g.total, acc = 0;
  for (let j = 0; j < g.idx.length; j++) { acc += g.lens[j]; if (pos <= acc) return g.idx[j]; }
  return g.idx[g.idx.length - 1];
}

export function ListenBar({ docSlug, label, contentRef }: { docSlug: string; label: string; contentRef: React.RefObject<HTMLElement | null> }) {
  const [chunkCount, setChunkCount] = useState<number | null>(null); // null = still checking manifest
  const [engine, setEngine] = useState<"real" | "browser" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState("");
  const [hasSavedPos, setHasSavedPos] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const parasRef = useRef<HTMLElement[]>([]);
  const groupsRef = useRef<{ idx: number[]; lens: number[]; total: number }[]>([]);
  const syncOkRef = useRef(false);
  const curParaRef = useRef(-1);
  const lastSaveRef = useRef(0);
  const pendingSeekRef = useRef<{ from: "start" | "end"; t: number } | null>(null);
  const speechIdxRef = useRef(-1);
  const filesRef = useRef<string[]>([]);

  useEffect(() => {
    setRate(ratePref());
    setHasSavedPos(!!loadPos(docSlug));
    fetch("/audio/manifest.json").then((r) => (r.ok ? r.json() : {})).then((m) => {
      const entry = m[docSlug];
      setChunkCount(entry?.chunks || 0);
    }).catch(() => setChunkCount(0));
  }, [docSlug]);

  function collectParas(): HTMLElement[] {
    const root = contentRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p, li"));
  }
  function clearHighlight() { parasRef.current.forEach((p) => p.classList.remove("reading")); curParaRef.current = -1; }
  function setReading(i: number) {
    if (i === curParaRef.current) return;
    if (curParaRef.current >= 0 && parasRef.current[curParaRef.current]) parasRef.current[curParaRef.current].classList.remove("reading");
    curParaRef.current = i;
    const el = parasRef.current[i];
    if (el) { el.classList.add("reading"); try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {} }
  }

  // ---- RealNarrator (pre-generated Google Cloud TTS audio) ----
  function ensureAudio(): HTMLAudioElement {
    if (audioRef.current) return audioRef.current;
    const a = new Audio();
    a.playbackRate = ratePref();
    a.addEventListener("ended", advanceChunk);
    a.addEventListener("timeupdate", tick);
    a.addEventListener("loadedmetadata", onMeta);
    audioRef.current = a;
    return a;
  }
  function chunkSecs(idx: number): number {
    const g = groupsRef.current[idx];
    const a = audioRef.current;
    if (!g) return 0;
    if (a && a.duration && isFinite(a.duration) && a.duration > 0) return a.duration;
    return g.total / (CHARS_PER_SEC_ESTIMATE * ((a && a.playbackRate) || 1));
  }
  function syncReading(idx: number) {
    if (!syncOkRef.current || !audioRef.current) return;
    const g = groupsRef.current[idx];
    if (!g) return;
    const secs = chunkSecs(idx);
    if (!secs) return;
    let frac = (audioRef.current.currentTime || 0) / secs;
    frac = Math.max(0, Math.min(1, frac));
    setReading(paraAtLocal(g, frac));
  }
  function tick() {
    const a = audioRef.current;
    setChunkIdx((idx) => { syncReading(idx); return idx; });
    if (!a) return;
    const t = a.currentTime || 0;
    if (t - lastSaveRef.current > 4) { lastSaveRef.current = t; setChunkIdx((idx) => { savePos(docSlug, idx, t); return idx; }); }
  }
  function onMeta() {
    const a = audioRef.current;
    if (!a) return;
    const seek = pendingSeekRef.current;
    if (seek) {
      try {
        if (seek.from === "end") a.currentTime = Math.max(0, (a.duration || 0) - seek.t);
        else a.currentTime = Math.min(seek.t, a.duration || seek.t);
      } catch {}
      pendingSeekRef.current = null;
    }
    setChunkIdx((idx) => { syncReading(idx); return idx; });
  }
  function loadChunk(idx: number, autoplay: boolean) {
    const a = ensureAudio();
    a.src = filesRef.current[idx];
    a.playbackRate = ratePref();
    if (autoplay) a.play().catch(() => setPlaying(false));
  }
  function advanceChunk() {
    setChunkIdx((idx) => {
      const next = idx + 1;
      if (next >= filesRef.current.length) {
        setPlaying(false); setStarted(false); clearHighlight(); clearPos(docSlug);
        return 0;
      }
      lastSaveRef.current = 0;
      loadChunk(next, true);
      return next;
    });
  }

  function startReal(rid: string) {
    const files: string[] = [];
    for (let i = 0; i < (chunkCount || 0); i++) files.push(`/audio/${rid}-${i}.mp3`);
    filesRef.current = files;
    parasRef.current = collectParas();
    groupsRef.current = parasRef.current.length ? groupParas(parasRef.current.map((p) => p.textContent || ""), 2400) : [];
    syncOkRef.current = groupsRef.current.length === files.length && files.length > 0;
    curParaRef.current = -1;
    if (!files.length) return;

    const pos = loadPos(rid);
    let startIdx = 0, seekT = 0;
    if (pos && pos.c >= 0 && pos.c < files.length) { startIdx = pos.c; seekT = pos.t || 0; }
    lastSaveRef.current = 0;
    setChunkIdx(startIdx);
    setPlaying(true); setStarted(true); setEngine("real");
    if (seekT > 0) pendingSeekRef.current = { from: "start", t: seekT };
    loadChunk(startIdx, true);
  }

  // ---- Narrator (browser speech fallback, for anything not yet narrated) ----
  function speakAt(i: number) {
    const paras = parasRef.current;
    if (i >= paras.length) { setPlaying(false); speechIdxRef.current = -1; clearHighlight(); return; }
    speechIdxRef.current = i;
    setReading(i);
    if (typeof window === "undefined" || !window.speechSynthesis) { setPlaying(false); return; }
    const u = new SpeechSynthesisUtterance(paras[i].textContent || "");
    u.rate = ratePref();
    u.onend = () => speakAt(i + 1);
    u.onerror = () => speakAt(i + 1);
    window.speechSynthesis.speak(u);
  }
  function startBrowser() {
    parasRef.current = collectParas();
    setEngine("browser"); setPlaying(true); setStarted(true);
    speakAt(0);
  }

  function handlePlay() {
    if (playing) {
      setPlaying(false);
      if (engine === "real") { audioRef.current?.pause(); savePos(docSlug, chunkIdx, audioRef.current?.currentTime || 0); }
      else if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }
    if (started && engine === "real") { setPlaying(true); const a = ensureAudio(); if (!a.src) loadChunk(chunkIdx, true); else a.play().catch(() => {}); return; }
    if (started && engine === "browser") { setPlaying(true); speakAt(speechIdxRef.current < 0 ? 0 : speechIdxRef.current); return; }
    if (chunkCount && chunkCount > 0) startReal(docSlug); else startBrowser();
  }
  function handleStop() {
    setPlaying(false); setStarted(false);
    if (engine === "real") { audioRef.current?.pause(); audioRef.current?.removeAttribute("src"); clearPos(docSlug); setHasSavedPos(false); }
    else if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setChunkIdx(0); clearHighlight(); setEngine(null); setStatus("");
  }
  function handleSkip(sec: number) {
    if (engine === "browser") {
      const t = sec < 0 ? Math.max(0, speechIdxRef.current - 1) : speechIdxRef.current + 1;
      if (t >= parasRef.current.length) return;
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      speakAt(t);
      return;
    }
    const a = audioRef.current;
    if (!a || !filesRef.current.length) return;
    const dur = a.duration || 0, t = (a.currentTime || 0) + sec;
    if (t >= 0 && (!dur || t <= dur)) { try { a.currentTime = t; } catch {} syncReading(chunkIdx); return; }
    if (t < 0) {
      if (chunkIdx > 0) { pendingSeekRef.current = { from: "end", t: -t }; setChunkIdx(chunkIdx - 1); loadChunk(chunkIdx - 1, true); }
      else { try { a.currentTime = 0; } catch {} }
    } else {
      const over = t - dur;
      if (chunkIdx < filesRef.current.length - 1) { pendingSeekRef.current = { from: "start", t: over }; setChunkIdx(chunkIdx + 1); loadChunk(chunkIdx + 1, true); }
      else { try { a.currentTime = dur; } catch {} }
    }
  }
  function handleJumpTo(n: number) {
    if (!filesRef.current.length || n < 0 || n >= filesRef.current.length) return;
    setChunkIdx(n); setPlaying(true); setStarted(true); pendingSeekRef.current = null; lastSaveRef.current = 0;
    loadChunk(n, true);
  }
  function handleRate(r: number) {
    setRate(r); setRatePref(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }

  useEffect(() => {
    setStatus(
      engine === "real" && filesRef.current.length ? `Reading part ${chunkIdx + 1} of ${filesRef.current.length}`
      : engine === "browser" && parasRef.current.length && speechIdxRef.current >= 0 ? `Reading ${speechIdxRef.current + 1} of ${parasRef.current.length}`
      : ""
    );
  }, [chunkIdx, playing, engine]);

  useEffect(() => () => { audioRef.current?.pause(); if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);

  if (chunkCount === null) return null; // still checking — avoid a flash of the wrong button state

  const btnLabel = playing ? "⏸ Pause" : started ? "▶ Resume" : hasSavedPos ? `▶ Resume ${label}` : `▶ ${label}`;

  return (
    <div className="listen-bar">
      <button type="button" className="btn btn-gold sm" onClick={handlePlay}>{btnLabel}</button>
      <button type="button" className="btn btn-ghost sm" onClick={() => handleSkip(-10)} disabled={!started} title="Back 10 seconds">⟲ 10s</button>
      <button type="button" className="btn btn-ghost sm" onClick={() => handleSkip(10)} disabled={!started} title="Forward 10 seconds">10s ⟳</button>
      <button type="button" className="btn btn-ghost sm" onClick={handleStop} disabled={!started}>■ Stop</button>
      {engine === "real" && filesRef.current.length > 1 && (
        <select className="listen-select" aria-label="Jump to part" value={chunkIdx} onChange={(e) => handleJumpTo(parseInt(e.target.value, 10))}>
          {filesRef.current.map((_, i) => <option key={i} value={i}>Part {i + 1} of {filesRef.current.length}</option>)}
        </select>
      )}
      <select className="listen-select" aria-label="Reading speed" value={rate} onChange={(e) => handleRate(parseFloat(e.target.value))}>
        {RATE_VALUES.map((r) => <option key={r} value={r}>{r}×</option>)}
      </select>
      <span className="listen-status">{status}</span>
      {chunkCount === 0 && <span className="listen-status" style={{ color: "#98895f" }}>Browser voice — full narration coming soon</span>}
    </div>
  );
}
