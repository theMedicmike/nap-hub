"use client";
import { useState } from "react";

export function FounderForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const r = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "signatory", name, email, public: true }),
      });
      setStatus(r.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p style={{ color: "var(--ivory-soft)", marginTop: 20 }}>Thank you — your name is recorded for review. Welcome to the founders.</p>;
  }

  return (
    <form className="form-row" style={{ maxWidth: 520, margin: "20px auto 0" }} onSubmit={submit}>
      <input type="text" placeholder="Your full name" aria-label="Your full name" required value={name} onChange={(e) => setName(e.target.value)} />
      <input type="email" placeholder="name@email.com" aria-label="Your email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="btn btn-gold" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : "Sign on"}
      </button>
      {status === "error" && (
        <p style={{ color: "var(--ivory-faint)", fontSize: 12, width: "100%", marginTop: 8 }}>
          Storage isn&apos;t connected yet — once Supabase is linked, sign-ons are saved for review.
        </p>
      )}
    </form>
  );
}
