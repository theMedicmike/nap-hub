import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import { CONTACT_EMAIL } from "@/lib/contact";
import "../pages.css";

export const metadata = {
  title: "Contact — NAP",
  description: "How to reach the people building NAP: proposals, corrections, research and review partnerships, and press.",
};

function Mail({ subject, label }: { subject: string; label: string }) {
  if (!CONTACT_EMAIL) return <span className="rt-pending">Email address coming soon</span>;
  return (
    <a className="btn btn-glass" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}>{label}</a>
  );
}

export default function Contact() {
  return (
    <PageShell
      title="Reach the people building it."
      lede={
        <>
          NAP is built in public, by anyone willing to make it better. Pick the door that fits what you have, and it
          will reach the right hands.
        </>
      }
    >
      <Sec id="doors" title="Choose a door." wide>
        <div className="rt">
          <div className="rt-r">
            <div>
              <h3>Change something in the framework</h3>
              <p>Propose a correction, a missing study, or a better way to say something. The guide helps you turn it into a clear proposal.</p>
            </div>
            <Link className="btn btn-thread" href="/shape">Join the build</Link>
          </div>
          <div className="rt-r">
            <div>
              <h3>Add your name</h3>
              <p>Clinicians, researchers, traditional practitioners, and patient advocates can stand with the work as a founder.</p>
            </div>
            <Link className="btn btn-glass" href="/founders#join">Add your name</Link>
          </div>
          <div className="rt-r">
            <div>
              <h3>Review the evidence</h3>
              <p>NAP is looking for independent clinicians and pharmacists to review its grades. Reviewers are named on what they review.</p>
            </div>
            <Mail subject="Reviewing NAP's evidence grades" label="Offer to review" />
          </div>
          <div className="rt-r">
            <div>
              <h3>Report an error or a privacy concern</h3>
              <p>A wrong figure, a broken page, an accessibility barrier, or a request to delete something you sent us.</p>
            </div>
            <Mail subject="Correction or request" label="Write to us" />
          </div>
          <div className="rt-r">
            <div>
              <h3>Press and partnerships</h3>
              <p>Journalists, universities, and organizations that want to work with NAP.</p>
            </div>
            <Mail subject="Press or partnership" label="Get in touch" />
          </div>
        </div>
      </Sec>

      <Sec id="health" title="Questions about your own health.">
        <p>
          NAP cannot advise individuals and does not review personal medical questions by email. For your own care,
          please talk with a licensed clinician. You can also <Link href="/ask">ask the NAP guide</Link> general questions
          about what the research says.
        </p>
        <p className="pg-pledge">
          In crisis or worried about someone? Call or text <a href="tel:988">988</a>, then press 1 for the Veterans
          Crisis Line. In an emergency, call <a href="tel:911">911</a>.
        </p>
      </Sec>
    </PageShell>
  );
}
