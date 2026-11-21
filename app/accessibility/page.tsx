import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import { CONTACT_EMAIL } from "@/lib/contact";
import "../pages.css";

export const metadata = {
  title: "Accessibility — NAP",
  description: "NAP's accessibility commitment, what the site already does, the gaps we know about, and how to report a barrier.",
};

export default function Accessibility() {
  const write = CONTACT_EMAIL
    ? <a href={`mailto:${CONTACT_EMAIL}?subject=Accessibility%20barrier`}>{CONTACT_EMAIL}</a>
    : <>the address on our <Link href="/contact">contact page</Link> (being set up now)</>;

  return (
    <PageShell
      title="Medicine for everyone has to be readable by everyone."
      lede={
        <>
          People come to NAP tired, in pain, with low vision, on a phone in a waiting room, or listening instead of
          reading. The site has to work for all of them.
        </>
      }
      updated="November 21, 2026"
    >
      <Sec id="aim" title="Our aim.">
        <p>
          We work toward the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA, the widely used international
          standard for accessible websites.
        </p>
      </Sec>

      <Sec id="done" title="What the site already does.">
        <ul>
          <li>Every founding document can be listened to as well as read.</li>
          <li>The menus and pages work with a keyboard, with a visible focus ring.</li>
          <li>Motion slows down or stops when your device asks for reduced motion.</li>
          <li>Paintings that carry meaning have text descriptions for screen readers.</li>
          <li>Writing is kept in plain English, with medical terms explained.</li>
          <li>The crisis line is on every page.</li>
        </ul>
      </Sec>

      <Sec id="gaps" title="Gaps we know about.">
        <ul>
          <li>The site has not yet been tested by an outside accessibility reviewer.</li>
          <li>A few older pages still use an earlier design and have not been rechecked.</li>
          <li>Audio narration has no separate transcript. The written document is its text.</li>
        </ul>
      </Sec>

      <Sec id="report" title="Tell us about a barrier.">
        <p>
          If anything on this site is hard to use, write to {write}. Tell us the page and what got in the way, and we
          will fix it or find another way to get you the information.
        </p>
      </Sec>
    </PageShell>
  );
}
