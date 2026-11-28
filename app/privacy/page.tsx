import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import { CONTACT_EMAIL } from "@/lib/contact";
import "../pages.css";

export const metadata = {
  title: "Privacy — NAP",
  description: "What napstandard.org collects, where it goes, and what it never does. Written in plain English.",
};

export default function Privacy() {
  const write = CONTACT_EMAIL
    ? <a href={`mailto:${CONTACT_EMAIL}?subject=Privacy%20request`}>{CONTACT_EMAIL}</a>
    : <>the address on our <Link href="/contact">contact page</Link> (being set up now)</>;

  return (
    <PageShell
      title="What we collect, and what we never do."
      lede={
        <>
          A health framework has to earn trust with data before it earns trust with anything else. This page says
          exactly what this site collects, where it goes, and why, in plain English.
        </>
      }
      updated="November 21, 2026"
    >
      <Sec id="short" title="The short version.">
        <ul>
          <li>No advertising, no ad trackers, and no analytics that follow you around.</li>
          <li>We do not sell or share your information for marketing. Ever.</li>
          <li>Conversations with the guide are not saved by NAP.</li>
          <li>We only keep what you choose to send us: your name, email, and proposal when you submit one, or a harm report if you file one.</li>
        </ul>
      </Sec>

      <Sec id="detail" title="Where your information goes.">
        <dl className="pg-rows">
          <div className="pg-row">
            <dt>Reading the site</dt>
            <dd>
              Our host, Vercel, keeps standard server logs, such as your IP address and the pages requested, to run and
              protect the site. We do not use them to build a profile of you. To keep the AI guide, voice and forms from
              being overused, we count requests using a scrambled code made from your IP address, never the address
              itself, and delete those counts within two days.
            </dd>
          </div>
          <div className="pg-row">
            <dt>Asking the guide</dt>
            <dd>
              Your messages are sent to Anthropic, the company that runs the AI model, so it can write an answer. NAP
              does not store the conversation. Anthropic handles that data under its own policies.
            </dd>
          </div>
          <div className="pg-row">
            <dt>Speaking and listening</dt>
            <dd>
              If you speak to the guide, your browser turns speech into text; some browsers do this on their maker&apos;s
              servers. If the guide answers out loud, the text of its answer is sent to ElevenLabs to make the audio.
            </dd>
          </div>
          <div className="pg-row">
            <dt>Shaping an idea</dt>
            <dd>
              What you type is sent to OpenAI, to find the matching parts of the framework, and to Anthropic, to help you
              phrase it. Nothing is saved unless you choose to submit it.
            </dd>
          </div>
          <div className="pg-row">
            <dt>Submitting or signing</dt>
            <dd>
              When you submit a proposal or add your name, we store what you entered, including your email, in our
              database (Supabase). Your name appears publicly only if you tick the box to show it. Your email is never
              published.
            </dd>
          </div>
          <div className="pg-row">
            <dt>Reporting a harm</dt>
            <dd>
              If you tell us something hurt you on the <Link href="/report">report page</Link>, we store what you typed
              (what was taken, what happened, when, and a way to reach you only if you chose to leave one) in our database
              (Supabase), with the same scrambled connection code used for the usage counts, never your IP address. It is
              read by the people who run NAP, is never published, and is not sent to anyone else. If the harm came from a
              product, the FDA&apos;s MedWatch program is the place that can act on it; we cannot forward your report there.
            </dd>
          </div>
          <div className="pg-row">
            <dt>Cookies and storage</dt>
            <dd>
              One cookie remembers access to the database preview if you were given a key. Your place in an audio
              narration is saved in your own browser and never sent to us.
            </dd>
          </div>
        </dl>
      </Sec>

      <Sec id="care" title="Please don't share health details.">
        <p>
          The guide is educational. It does not need your name, your diagnoses, or your medications to answer a general
          question, so please leave them out. For anything about your own care, talk with a licensed clinician.
        </p>
      </Sec>

      <Sec id="choices" title="Your choices.">
        <p>
          You can ask us to show you, correct, or delete anything you submitted. Write to {write}, and we will act on
          it. This site is not directed to children under 13, and we do not knowingly collect their information.
        </p>
        <p>
          When this notice changes, the change is recorded on the <Link href="/changelog">changelog</Link>.
        </p>
        <p className="pg-fine">
          This notice describes how the site works today. It is written in plain language and has not yet been reviewed
          by an attorney.
        </p>
      </Sec>
    </PageShell>
  );
}
