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
