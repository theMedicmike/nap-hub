"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

interface Msg { role: "user" | "assistant"; content: string }

const WELCOME =
  "Hi — I'm your NAP guide. Ask me anything about health through the terrain-first lens: root causes, the biological drivers of chronic illness, what the evidence says, and how the body's systems connect. You can type, or tap the microphone and just talk to me. I'm educational, not a doctor — and for anything specific to you, I'll always point you to a licensed clinician. What's on your mind?";

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
        body: JSON.stringify(
