"use client";
import { useEffect, useRef, useState } from "react";
import type { Era } from "./Timeline";
import { Painting } from "./Painting";
import { PlantArt } from "./PlantArt";

// Meet the Circle: all eleven healers. Each portrait opens a lightbox with the full story.
export function Circle({ healers }: { healers: Era[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const close = () => { setOpen(null); opener.current?.focus(); };
  const h = open !== null ? healers[open] : null;
  const step = (n: number) => setOpen((i) => (i === null ? i : (i + n + healers.length) % healers.length));

  return (
    <section className="uc" id="circle" aria-labelledby="uc-h">
      <div className="u-wrap">
        <h2 id="uc-h" className="u-h2">Meet the Circle.</h2>
        <p className="u-lede">
          Eleven healers, five thousand years apart, standing in one circle. Nobody leads it, and no tradition ranks
          above another. Open any portrait to hear their story.
        </p>
        <ul className="uc-grid">
          {healers.map((p, i) => (
            <li key={p.id} className="uc-cell">
              <button
                type="button"
                className="uc-card"
                onClick={(ev) => { opener.current = ev.currentTarget; setOpen(i); }}
                aria-haspopup="dialog"
              >
                <span className="uc-frame">
                  <Painting src={p.src} alt={`Portrait of ${p.name}`} focal={p.focal} sky={p.sky} plant={p.plantKey} name={p.name} label={!p.src} />
                </span>
                <span className="uc-meta">
                  <span className="uc-name">{p.name}</span>
                  <span className="uc-era">{p.era}, {p.place}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="uc-fine">
          The healers of the Circle are fictional composites, inspired by real traditions and eras. The plant histories
          they carry are real and sourced. Traditional use is honored here as history, never offered as evidence.
        </p>
      </div>

      <dialog
        ref={dlg}
        className="lb"
        aria-labelledby="lb-name"
        onClose={() => setOpen(null)}
        onClick={(e) => { if (e.target === dlg.current) close(); }}
        onKeyDown={(e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }}
      >
        {h && (
          <div className="lb-in" key={h.id}>
            <div className="lb-art">
              <Painting src={h.src} alt={`${h.name}, ${h.role.toLowerCase()}`} focal={h.focal} sky={h.sky} plant={h.plantKey} name={h.name} eager />
            </div>
            <div className="lb-copy">
              <p className="era-when">{h.era}</p>
              <h3 id="lb-name" className="lb-name">{h.name}</h3>
              <p className="era-role">{h.role}, {h.place}</p>
              <p className="lb-story">{h.story}</p>
              <p className="era-plant">
                <PlantArt plant={h.plantKey} className="era-plant-ic" />
                <span>Carries: {h.plant.charAt(0).toLowerCase() + h.plant.slice(1)}</span>
              </p>
              <div className="lb-nav">
                <button type="button" className="btn btn-glass sm" onClick={() => step(-1)}>Previous healer</button>
                <button type="button" className="btn btn-glass sm" onClick={() => step(1)}>Next healer</button>
              </div>
            </div>
            <button type="button" className="lb-x" onClick={close} aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </div>
        )}
      </dialog>
    </section>
  );
}
