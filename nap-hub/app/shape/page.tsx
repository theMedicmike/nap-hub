import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ShapeChat } from "@/components/ShapeChat";

export const metadata = {
  title: "Shape it — NAP",
  description: "Bring an idea to the NAP framework. The guide checks it against the canon and helps you shape a contribution.",
};

export default function Shape() {
  return (
    <>
      <Nav />
      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy" style={{ flex: 1 }}>
            <div className="eyebrow">Shape it</div>
            <h1 style={{ fontSize: 32 }}>Help shape the framework.</h1>
            <p>Bring an idea, a question, or a challenge. The guide reads the entire canon, shows you where your thought already lives — or helps you turn it into a clear, new contribution for the founders to review.</p>
          </div>
        </div>
      </section>

      <main className="shape-wrap">
        <div className="note">
          The guide proposes; it never edits the canon on its own. Every accepted contribution is reviewed by a
          human and credited to its author — that&apos;s what keeps NAP a governed standard, not an open wiki.
        </div>
        <Suspense fallback={<div className="chat"><div className="chat-log">Loading…</div></div>}>
          <ShapeChat />
        </Suspense>
        <p style={{ color: "var(--slate)", fontSize: 12.5, marginTop: 14 }}>
          Your contribution and name are only added after a human review. See the{" "}
          <a href="/founders" style={{ color: "var(--gold)" }}>Founders page</a> for how recognition works.
        </p>
      </main>
      <Footer />
    </>
  );
}
