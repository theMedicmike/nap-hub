# NAP Hub — the full web app

The complete Nutraceutical Assisted Programs website **and** app: the marketing site, all 12 founding documents, the AI "Shape It" guide, and a live Founders wall. Built with Next.js + Supabase — the same stack as the Connecting the Dots app.

---

## Run it on your machine (5 minutes)

You have Node installed already. In PowerShell:

```powershell
cd "$HOME\OneDrive\Desktop\NAP Website\nap-hub"
npm install
npm run dev
```

Open the link it prints (usually http://localhost:3000). The whole site works immediately — every page and all 12 documents. The AI guide and the Founders database show a friendly "not connected yet" state until you add keys (next section).

> If `npm run dev` shows an error, copy it here and I'll tell you the one-line fix. Because this was authored outside a build environment, a small tweak or two is normal on first run.

---

## Turn on the AI + database

Create a file named `.env.local` in this folder (copy `.env.example`) and fill in:

```
ANTHROPIC_API_KEY=...          # required — the Shape It guide (console.anthropic.com)
OPENAI_API_KEY=...             # optional — lets the guide check ideas against the canon
SUPABASE_URL=...               # optional — the database (founders + contributions)
SUPABASE_SERVICE_ROLE_KEY=...  # optional — same
```

Then, one time:

1. **Database:** in Supabase → SQL Editor, paste and run `supabase_schema.sql`.
2. **Load the canon** (so the guide can check ideas against your 12 docs):
   ```powershell
   $env:SUPABASE_URL="https://YOUR.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   $env:OPENAI_API_KEY="your-openai-key"
   npm run import-canon
   ```
3. Restart `npm run dev`. The guide now reads your framework; the Founders wall now saves real names.

---

## Put it online (Vercel)

```powershell
npm i -g vercel
vercel
vercel --prod
```

Then in the Vercel dashboard → your project → **Settings → Environment Variables**, add the same four keys from `.env.local`, and redeploy. Point your domain (e.g. `nap.health`) at it under **Settings → Domains**.

---

## What's inside

```
app/
  page.tsx                  Home — "The Idea"
  framework/page.tsx        The 12 documents, by category
  framework/[slug]/page.tsx Each document, rendered from /content
  where-it-stands/page.tsx  The honest status page
  founders/page.tsx         The Founders wall (reads the database)
  shape/page.tsx            The AI "Shape It" guide
  api/shape/route.ts        The guide's brain: canon retrieval + Claude
  api/contribute/route.ts   Saves sign-ons and proposals for review
components/                 Nav, Footer, Seal, ShapeChat, FounderForm
lib/                        canon.ts (the 12 docs), supabase.ts
content/                    Your 12 founding documents (Markdown)
scripts/import-canon.mjs    Loads the canon into Supabase
supabase_schema.sql         The database
```

## Guardrails baked in
- The AI **proposes**; it never edits the canon. Contributions land as `pending` for your review.
- Every page carries "early-stage prototype — not medical advice."
- The Founders wall is earned by a verified sign-on or accepted contribution — not just an email.

Model: `claude-sonnet-4-6` (change `MODEL` in `app/api/shape/route.ts` to swap it).

---

## The safety layer and the harm-report path

Two things turn the Ask guide's safety from "the model read the note" into something code can check, and give a visitor a way to say something hurt them. Both are additive: nothing existing is dropped or rewritten.

**Structured safety layer** (`db/2026-11-27_safety_layer.sql`)
- `atlas_population_flags`: ingredient × population (pregnancy, breastfeeding, children, kidney, liver, elderly, surgery, bleeding_risk) → `avoid` or `caution`.
- `atlas_drug_interactions`: ingredient × drug class (the slugs in `DRUG_CLASSES`, `lib/ask-atlas.ts`) → `avoid`, `caution` or `monitor`, with a short `mechanism`.
- Every row has `status` (`draft` → `approved` or `rejected`) and `reviewed_by`. **The guide reads only `approved` rows.** Until a clinician or pharmacist approves a row, nothing changes.
- `scripts/draft-safety-rows.mjs` drafts rows from the 184 free-text safety notes by rule (no model): `node scripts/draft-safety-rows.mjs`. It writes `db/2026-11-27_safety_rows.sql` (idempotent, every row `draft`) plus a review sheet. Review the sheet, load the SQL, then approve rows one by one (the review sheet shows the `update ... set status = 'approved'` form).
- What the guide does with approved rows (`lib/ask-atlas.ts`, section 5): when the visitor's own words bring up a flagged population or a medicine in a flagged class and the reply names an ingredient with an `avoid` row, one plain sentence names the ingredient and the reason; `caution` and `monitor` rows ride along on the revision prompt. Only the visitor's turns count, never the guide's own generic warnings.
- Offline test: `knowledge/_CHECKPOINTS/2026-11-24_ask-test-and-main-button/verify-safety-layer.mts` (run with Node 24: `node verify-safety-layer.mts`).

**Harm reports** (`db/2026-11-27_harm_reports.sql`, `/report`, `app/api/report/route.ts`)
- A plain form: what was taken, what happened, when, and a way to reach you (optional). No diagnosis, no name. Rate-capped like every other route that writes (`LIMITS.report`). Stored with the scrambled visitor code, never the IP.
- No email is sent yet (the contact address in `lib/contact.ts` is still an open decision). New reports: `select * from harm_reports where status = 'new' order by created_at;`
- The page tells people that product harms also belong at FDA MedWatch, and shows 911 / 988 (veterans and their families press 1).

Both migrations are applied by hand with the local SQL runner, never by the app, and only on the owner's go.
