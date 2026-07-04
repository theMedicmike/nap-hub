# NAP Hub — Deploy Guide

This is the complete NAP Services website. It runs as-is with zero setup (just open `site/index.html`), and becomes fully live — including the AI "Shape It" guide — once you add three keys and deploy.

---

## What's in this folder

```
NAP_SITE/
├── site/                  ← THE WEBSITE (this is what you deploy)
│   ├── index.html             The Idea (homepage)
│   ├── framework.html         The 12 founding documents, by category
│   ├── docs/                  Each document as a reading page (real content)
│   ├── where-it-stands.html   The honest status page
│   ├── founders.html          The Founding Members wall + sign-on
│   ├── shape.html             The AI "Shape It" guide
│   ├── api/                   Serverless functions (shape.js, contribute.js)
│   ├── assets/                styles.css, app.js
│   └── vercel.json
└── engine/                ← SETUP TOOLS (not deployed)
    ├── supabase_schema.sql    Run once in Supabase
    ├── import-canon.mjs       Loads your 12 docs into the database
    └── package.json
```

---

## Look at it right now (no setup)

Double-click `site/index.html`. The whole site works — every page, all 12 documents, the founders wall. The only thing not live is the AI guide's *thinking* (it shows a friendly "not connected yet" note until you do the steps below).

---

## Make it fully live — 3 keys, ~30 minutes

You'll need three accounts you may already have: **Vercel** (hosting), **Supabase** (database), and an **Anthropic** API key (the Claude guide). Optionally an **OpenAI** key (lets the guide check ideas against the canon).

### Step 1 — Database (Supabase)
1. Create a project at supabase.com (or reuse the Connecting the Dots one).
2. Open **SQL Editor → New query**, paste all of `engine/supabase_schema.sql`, and **Run**.
3. From **Project Settings → API**, copy your `Project URL` and your `service_role` key.

### Step 2 — Load the canon
From the `engine/` folder, set the three variables and run the import:

```
# Windows PowerShell
$env:SUPABASE_URL="https://YOUR.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
$env:OPENAI_API_KEY="your-openai-key"
node import-canon.mjs
```

This reads your Markdown masters and fills `canon_sections` so the guide can check ideas against the framework. (Path assumes the masters are at `NAP_BUILD/masters` — set `MASTERS_DIR` to override.)

### Step 3 — Deploy the site (Vercel)
1. Put the `site/` folder in a Git repo (or drag it into a new Vercel project).
2. In **Vercel → Project → Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` — required (the guide)
   - `OPENAI_API_KEY` — optional (canon checking)
   - `SUPABASE_URL` — optional (canon checking + saving contributions)
   - `SUPABASE_SERVICE_ROLE_KEY` — optional (same)
3. Deploy. Point your domain (e.g. `nap.health`) at it.

That's it. The "Shape It" guide is now live, reads your whole framework, and helps people contribute.

---

## How the guide stays safe and honest
- The AI **proposes**; it never edits the canon. Contributions land in the `contributions` table as `pending` for your review.
- Every page carries the "early-stage prototype — not medical advice" line.
- Recognition (the Founders wall) is earned by a verified sign-on or an accepted contribution — not just an email.

## Tiers of "live"
- **Anthropic key only** → the guide works as a thinking partner (no canon lookup).
- **+ OpenAI + Supabase** → the guide checks every idea against your 12 documents and saves proposals for review.

## Model
The guide uses `claude-sonnet-4-6`. To change it, edit `MODEL` at the top of `site/api/shape.js`.
