"use client";
import { useState } from "react";

const MEDWATCH = "https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program";

type Status = "idle" | "saving" | "done" | "error" | "limit" | "offline";

// The harm-report form (/report). Four fields, two required, no diagnosis, no name. Posts to
// /api/report, which stores the report and tells us whether the words sounded urgent so the
// 911 / 988 card can be shown again after sending.
export function HarmReportForm() {
  const [taken, setTaken] = useState("");
  const [happened, setHappened] = useState("");
  const [when, setWhen] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: hidden from people, filled by bots
  const [status, setStatus] = useState<Status>("idle");
  const [urgent, setUrgent] = useState(false);
  const ready = taken.trim().length > 0 && happened.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || status === "saving") return;
    setStatus("saving");
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taken, happened, when, contact, website }),
      });
      if (r.status === 429) return setStatus("limit");
      if (r.status === 503) return setStatus("offline");
      if (!r.ok) return setStatus("error");
      const d = await r.json().catch(() => ({}));
      setUrgent(Boolean(d.urgent));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="hr-done" role="status">
        <p>Thank you. Your report is saved, and a person will read it.</p>
        {urgent && (
          <p>
            Your words sounded urgent. If you are in danger right now, call <a href="tel:911">911</a>. For thoughts of
            suicide or crisis, call or text <a href="tel:988">988</a>, then press 1 for the Veterans Crisis Line.
          </p>
        )}
        <p>
          If the harm came from a product, please also tell the FDA through{" "}
          <a href={MEDWATCH} target="_blank" rel="noopener noreferrer">MedWatch</a> or 1-800-FDA-1088. NAP cannot pass
          your report on for you.
        </p>
      </div>
    );
  }

  return (
    <form className="hr-form" onSubmit={submit} noValidate>
      <label className="hr-field">
        <span>What was taken? <em>required</em></span>
        <textarea
          rows={3}
          maxLength={1000}
          required
          value={taken}
          onChange={(e) => setTaken(e.target.value)}
          placeholder="The nutrient, herb or product; how much, how often, and for how long, as best you know."
        />
      </label>
      <label className="hr-field">
        <span>What happened? <em>required</em></span>
        <textarea
          rows={6}
          maxLength={5000}
          required
          value={happened}
          onChange={(e) => setHappened(e.target.value)}
          placeholder="What you noticed, how bad it was, and what you did about it. Plain words are fine."
        />
      </label>
      <label className="hr-field">
        <span>When did it happen? <em>optional</em></span>
        <input
          type="text"
          maxLength={200}
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          placeholder="A date, a month, or roughly how long ago"
        />
      </label>
      <label className="hr-field">
        <span>How can we reach you? <em>optional</em></span>
        <input
          type="text"
          maxLength={254}
          autoComplete="off"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="An email or phone number, only if you want a reply"
        />
      </label>
      <div className="hr-hp" aria-hidden="true">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      <p className="pg-fine">
        We do not ask for your name, a diagnosis, or your medical history. Please leave out anything you do not want kept.
      </p>
      <div className="hr-actions">
        <button className="btn btn-gold" type="submit" disabled={!ready || status === "saving"}>
          {status === "saving" ? "Sending…" : "Send the report"}
        </button>
        {status === "error" && <p className="hr-err" role="alert">That didn&apos;t save. Please try again in a moment.</p>}
        {status === "limit" && <p className="hr-err" role="alert">Too many reports from this connection just now. Please try again in an hour.</p>}
        {status === "offline" && (
          <p className="hr-err" role="alert">
            The report box isn&apos;t connected yet. Please use FDA MedWatch (below) for now.
          </p>
        )}
      </div>
    </form>
  );
}
