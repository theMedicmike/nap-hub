"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { PageShell } from "@/components/PageShell";
import "../pages.css";

interface Msg { role: "user" | "assistant"; content: string }

const WELCOME =
  "Hi, I'm the NAP guide. Ask me anything about health: root causes, the biological drivers of chronic illness, what the evidence says, and how the body's systems connect. You can type, or tap the microphone and just talk to me. I'm educational, not a doctor — and for anything specific to you, I'll always point you to a licensed clinician. What's on your mind?";

function cleanText(s: string): string {
  return String(s)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*-{3,}\s*$/gm, "")
    .replace(/\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function Ask() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [micSupported, setMicSupported] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceOnRef = useRef(true);

  useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages, busy]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setMicSupported(true);
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e: any) => { const text = e.results[0][0].transcript; setListening(false); void submit(text); };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
    }
    return () => { try { window.speechSynthesis?.cancel(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSpeaking = () => {
    try { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeaking(false);
  };

  const browserSpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98;
      const voices = window.speechSynthesis.getVoices();
      const male =
        voices.find((v) => /en/i.test(v.lang) && /(Daniel|Alex|Fred|Guy|Davis|Mark|Google UK English Male|Microsoft David)/i.test(v.name)) ||
        voices.find((v) => /en-US/i.test(v.lang));
      if (male) u.voice = male;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const speak = useCallback(async (text: string) => {
    if (!voiceOnRef.current) return;
    stopSpeaking();
    try {
      const r = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (r.ok) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplaying = () => setSpeaking(true);
        audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setSpeaking(false); browserSpeak(text); };
        await audio.play();
        return;
      }
    } catch {}
    browserSpeak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) { try { rec.stop(); } catch {} setListening(false); }
    else { stopSpeaking(); try { rec.start(); setListening(true); } catch {} }
  };

  async function submit(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (r.status === 429) {
        const d = await r.json().catch(() => ({}));
        setMessages((m) => [...m, { role: "assistant", content: d.reply || "The guide has reached its limit for now. Please try again later. In an emergency call 911; for thoughts of suicide or crisis, call or text 988 (veterans and their families press 1)." }]);
        return;
      }
      if (!r.ok) throw new Error("not connected");
      const data = await r.json();
      const reply = cleanText(data.reply || "I'm here — could you say a bit more?");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      void speak(reply);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "The guide couldn't answer just now. Please try again in a moment. In an emergency call 911; for thoughts of suicide or crisis, call or text 988 (veterans and their families press 1)." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Ask the NAP guide."
      lede={
        <>
          Ask about root causes, the drivers of chronic illness, and what the graded evidence actually says. Type or
          speak, and it can answer out loud. It is educational, never a substitute for your own clinician, and honest
          about what is not yet known.
        </>
      }
    >
      <section className="pgs pgs-wide ask" aria-label="Conversation with the NAP guide">
        <div className="ask-bar">
          <button
            type="button"
            className={`ask-tog${voiceOn ? " on" : ""}`}
            aria-pressed={voiceOn}
            onClick={() => { const n = !voiceOn; setVoiceOn(n); if (!n) stopSpeaking(); }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />{voiceOn ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> : <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}</svg>
            {voiceOn ? "Voice on" : "Voice off"}
          </button>
          {speaking && (
            <button type="button" className="ask-tog" onClick={stopSpeaking}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
              Stop speaking
            </button>
          )}
          {speaking && <span className="ask-live" role="status">The guide is speaking…</span>}
        </div>

        <div className="ask-log" ref={logRef} aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`ask-msg ${m.role === "user" ? "ask-you" : "ask-ai"}`}>{m.content}</div>
          ))}
          {busy && <div className="ask-msg ask-ai ask-think">Thinking…</div>}
        </div>

        <form className="ask-in" onSubmit={(e) => { e.preventDefault(); submit(input); }}>
          {micSupported && (
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? "Stop listening" : "Speak your question"}
              title={listening ? "Listening — tap to stop" : "Tap and speak"}
              className={`ask-mic${listening ? " on" : ""}`}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          )}
          <input
            type="text"
            placeholder={listening ? "Listening…" : "Ask about your health…"}
            aria-label="Your question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn btn-gold" type="submit" disabled={busy}>Send</button>
        </form>

        <p className="pg-fine ask-foot">
          {micSupported
            ? "Tap the microphone and speak; the guide answers out loud. "
            : "Voice input works best in Chrome, Edge, or Safari. "}
          This guide is educational, not medical advice. In an emergency call 911. For thoughts of suicide or crisis,
          call or text 988 (veterans and their families press 1).
        </p>
      </section>
    </PageShell>
  );
}
