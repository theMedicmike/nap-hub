import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import { HarmReportForm } from "@/components/HarmReportForm";
import "../pages.css";

export const metadata = {
  title: "Report a harm — NAP",
  description:
    "If a nutrient, botanical or anything you read about here left you worse off, tell NAP. A plain form, no diagnosis asked. Product harms also belong at FDA MedWatch.",
};

const MEDWATCH = "https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program";

export default function Report() {
  return (
    <PageShell
      title="Tell us if something hurt you."
      lede={
        <>
          If a nutrient, herb or supplement you read about here left you worse off, we want to know. NAP is educational,
          not a clinic: nothing here can diagnose or treat you. But a reference that cannot hear about harm cannot be
          trusted, so this page exists.
        </>
      }
    >
      <Sec id="now" title="If this is happening right now.">
        <p className="pg-pledge">
          Call <a href="tel:911">911</a> for an emergency. For thoughts of suicide or crisis, call or text{" "}
          <a href="tel:988">988</a>, then press 1 for the Veterans Crisis Line (veterans and their families). This form is
          not read in real time.
        </p>
      </Sec>

      <Sec id="form" title="What happened." wide>
        <HarmReportForm />
      </Sec>

      <Sec id="medwatch" title="Report the product to the FDA too.">
        <p>
          NAP is not a regulator and cannot pass reports on. Harm from a supplement or any other product belongs with the
          FDA&apos;s MedWatch program, which can act on it:{" "}
          <a href={MEDWATCH} target="_blank" rel="noopener noreferrer">fda.gov/medwatch</a> or 1-800-FDA-1088. If you can,
          keep the bottle and note the lot number.
        </p>
      </Sec>

      <Sec id="next" title="What happens to your report.">
        <ul>
          <li>It is stored in NAP&apos;s database and read by the people who run NAP. There is no automatic alert yet, so a reply can take time.</li>
          <li>If you left a way to reach you, we may follow up to understand what happened. Nothing that could identify you is ever published.</li>
          <li>Reports are how NAP learns what the studies miss. A report that changes a safety note is recorded on the <Link href="/changelog">changelog</Link>.</li>
          <li>We keep what you typed and a scrambled code made from your connection, never the address itself, to stop abuse. See <Link href="/privacy">privacy</Link>.</li>
        </ul>
      </Sec>
    </PageShell>
  );
}
