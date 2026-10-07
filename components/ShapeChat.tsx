"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Msg { role: "user" | "assistant"; content: string }

export function ShapeChat() {
  const params = useSearchParams();
  const docCtx = params.get("doc");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcome = docCtx
      ? `You’re proposing a change to the "${docCtx.replace(/-/g, " ")}" document. Tell me your idea in your own words — I’ll check it against the framework and help you shape it into a clear contribution.`
      : "Welcome. Bring an idea, a question, or a critique about the NAP framework. I’ll help you sharpen it into a clear proposal. I can’t search the framework documents yet, and nothing here is saved — so copy anything you want to keep. What’s on your mind?";
    setMessages([{ role: "assistant", content: welcome }]);
  }, [docCtx]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/shape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, doc: docCtx }),
      });
      if (!r.ok) throw new Error("not connected");
      const data = await r.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "Noted for review." }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "The guide couldn’t respond just now, and your message was not saved. Please copy your idea and try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="chat">
        <div className="chat-log" ref={logRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "msg-user" : "msg-ai"}`}>{m.content}</div>
          ))}
          {busy && <div className="msg msg-ai">Thinking…</div>}
        </div>
        <form className="chat-in" onSubmit={send}>
          <input
            type="text"
            placeholder="Share your idea for the framework…"
            aria-label="Your idea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn btn-gold" type="submit" disabled={busy}>Send</button>
        </form>
      </div>
    </>
  );
}
