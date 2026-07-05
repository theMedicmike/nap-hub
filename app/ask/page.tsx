"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

interface Msg { role: "user" | "assistant"; content: string }

const WELCOME =
  "Hi — I'm your NAP guide. Ask me anything about health through the terrain-first lens: root causes, the biological drivers of chronic illness, what the evidence says, and how the body's systems connect. You can type, or tap the microphone and just talk to me. I'm educational, not a doctor — and for anything specific to you, I'll always point you to a licensed clinician. What's on your mind?";

export default function Ask() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [micSupported, setMicSupported] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const voiceOnRef = useRef(true);

  useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVoiceSupported("speechSynthesis" in window);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setMicSupported(true);
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setListening(false);
        void submit(text);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
    }
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = useCallback((text: string) => {
    if (!voiceOnRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98;
      u.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /en-US/i.test(v.lang) && /(Samantha|Aria|Jenny|Natural|Google US English)/i.test(v.name)) ||
        voices.find((v) => /en-US/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang));
      if (preferred) u.voice = preferred;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {}
  }, []);

  const stopSpeaking = () => {
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeaking(false);
  };

  const toggleMic = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      try { rec.stop(); } catch {}
      setListening(false);
    } else {
      stopSpeaking();
      try { rec.start(); setListening(true); } catch {}
    }
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
      if (!r.ok) throw new Error("not connected");
      const data = await r.json();
      const reply = data.reply || "I'm here — could you say a bit more?";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      const msg = "The guide isn't connected to its knowledge yet in this preview — that goes live once the Claude key is set. Check back shortly.";
      setMessages((m) => [...m, { role: "assistant", content: msg }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Nav />
      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy" style={{ flex: 1 }}>
            <div className="eyebrow">Ask · your terrain-first health guide</div>
            <h1 style={{ fontSize: 32 }}>Talk with the NAP guide.</h1>
            <p>Ask about root causes, the drivers of chronic illness, and what the evidence actually says — grounded in the NAP framework and Atlas. Type or speak; it can talk back. Educational, evidence-graded, and always honest about its limits.</p>
          </div>
        </div>
      </section>

      <main className="shape-wrap">
        <div className="note">
          This guide is educational, not medical advice. For anything urgent or serious it will point you to a doctor or emergency care — and you should always work with a licensed clinician for your own health.
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "0 0 12px", flexWrap: "wrap" }}>
          {voiceSupported && (
            <button
              type="button"
              onClick={() => { const n = !voiceOn; setVoiceOn(n); if (!n) stopSpeaking(); }}
              className="btn"
              style={{ background: voiceOn ? "var(--ink)" : "transparent", color: voiceOn ? "var(--ivory)" : "var(--ink)", border: "1px solid var(--ink)", padding: "7px 15px", fontSize: 13 }}
            >
              {voiceOn ? "🔊 Voice on" : "🔇 Voice off"}
            </button>
          )}
          {speaking && (
            <button type="button" onClick={stopSpeaking} className="btn" style={{ background: "transparent", color: "var(--slate)", border: "1px solid var(--slate)", padding: "7px 15px", fontSize: 13 }}>
              ■ Stop speaking
            </button>
          )}
          {speaking && <span style={{ color: "var(--gold)", fontSize: 12.5 }}>The guide is speaking…</span>}
        </div>

        <div className="chat">
          <div className="chat-log" ref={logRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "msg-user" : "msg-ai"}`}>{m.content}</div>
            ))}
            {busy && <div className="msg msg-ai">Thinking…</div>}
          </div>
          <form className="chat-in" onSubmit={(e) => { e.preventDefault(); submit(input); }}>
            {micSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "Stop listening" : "Speak"}
                title={listening ? "Listening — tap to stop" : "Tap and speak"}
                className="btn"
                style={{ background: listening ? "#B48A2F" : "var(--ink)", color: listening ? "#14233B" : "var(--ivory)", padding: "0 14px", fontSize: 17, minWidth: 46 }}
              >
                {listening ? "●" : "🎤"}
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
        </div>

        <p style={{ color: "var(--slate)", fontSize: 12.5, marginTop: 14 }}>
          {micSupported
            ? "Tap the microphone and speak; the guide can answer out loud. "
            : "Voice input works best in Chrome, Edge, or Safari. "}
          In an emergency call 911. For thoughts of suicide or crisis, call or text 988 (veterans press 1).
        </p>
      </main>
      <Footer />
    </>
  );
}
