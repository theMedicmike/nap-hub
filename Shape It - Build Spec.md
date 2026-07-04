# "Shape It" — NAP Contribution Engine + Founding Members Wall
## v1 Build Specification

**Project:** The NAP Services hub website — the interactive layer
**Goal of v1:** Turn the site from a place people *read* into a place people *join*. One loop: a visitor brings an idea → an AI shapes it and checks it against the existing NAP framework → a human (Michael) curates it → the contributor's name joins the Founding Members wall, attributed to the principle they shaped.
**Stack:** Next.js (existing), Supabase + Postgres + pgvector (existing instance), Claude API (Claude Sonnet 4.6) for the chat, Supabase Auth for contributor identity, the locked NAP design system (ink #14233B / gold #B48A2F / ivory #F4EFE4, classical serif + clean sans, the 8-system seal).

---

## 1. The Core Loop (what the user experiences)

1. A visitor reads the framework (the 12 documents, broken into addressable principles).
2. On any principle, or from a global **"Shape It"** button, they open the AI chat.
3. They type an idea, a critique, or a suggestion.
4. The AI — which has the *entire NAP canon* as context — does three things:
   - **Checks the canon.** "Here's where your idea already lives" (with a link to the exact principle) — or "This is genuinely new."
   - **Shapes it.** Helps them turn a rough thought into a clear, structured proposal.
   - **Frames it** as either a *new contribution* or an *amendment* to an existing principle.
5. When the idea is ready, the AI emits a clean **Contribution Card**: title, target document/section, the proposal text, and the rationale.
6. To submit, the user signs in (Supabase Auth). This is the quality gate — no anonymous noise.
7. The contribution lands in a **moderation queue** (status: `pending`).
8. Michael reviews: **accept / send back to refine / decline.** Accepted contributions:
   - Update the canon (a new version of that document/section).
   - Get **attributed** — "Shaped by [Name]" appears on the principle.
   - Bump the contributor's tier and add them to the **Founding Members wall.**
9. The wall grows. The framework visibly evolves. People come back to shape more.

**The guardrail that defines the product:** the AI *proposes*; a human *curates*. The AI never edits the canon on its own. That is what keeps NAP a *governed standard* rather than an open wiki — the integrity is the product.

---

## 2. Data Model (Supabase / Postgres)

```
canon_documents
  id            uuid pk
  slug          text unique          -- "manifesto", "evidence-compendium", ...
  title         text
  category      text                 -- "Core Framework" | "Governance" | "Clinical" | "Integrity"
  reading_order int
  current_version int                 -- bumped on each accepted change
  updated_at    timestamptz

canon_sections                        -- each principle = one addressable, shareable unit
  id            uuid pk
  document_id   uuid fk -> canon_documents
  anchor        text                 -- url-safe slug for deep-linking / sharing
  heading       text
  content       text
  embedding     vector(1536)         -- pgvector; powers RAG + dedupe
  order_index   int
  updated_at    timestamptz

contributors
  id              uuid pk
  auth_user_id    uuid fk -> auth.users
  display_name    text
  public_optin    bool default false  -- only public names appear on the wall
  bio             text
  tier            text default 'signatory'  -- 'signatory' | 'contributor' | 'architect'
  joined_at       timestamptz

contributions
  id              uuid pk
  contributor_id  uuid fk -> contributors
  type            text                -- 'new' | 'amendment'
  target_section_id uuid fk nullable -> canon_sections
  title           text
  proposal_text   text
  rationale       text
  ai_canon_match  jsonb               -- what the AI found: matched sections, similarity scores
  status          text default 'pending'  -- 'pending' | 'refining' | 'accepted' | 'declined'
  reviewer_notes  text
  created_at      timestamptz
  reviewed_at     timestamptz

section_attributions                  -- "this principle was shaped by..."
  id              uuid pk
  section_id      uuid fk -> canon_sections
  contributor_id  uuid fk -> contributors
  contribution_id uuid fk -> contributions
  created_at      timestamptz
```

---

## 3. The AI "Shape It" Component

**Setup (one-time):** chunk the 12 documents into `canon_sections`, embed each with an embedding model, store the vector in pgvector. (This same table also powers the public framework pages and share-by-section — build it once, use it three ways.)

**Per message flow:**
1. User message → embed the query → `pgvector` similarity search → top-k relevant `canon_sections`.
2. Pass those sections + the conversation to Claude (Claude Sonnet 4.6) via a Next.js API route (`/api/shape`).
3. Claude responds conversationally, grounded in the retrieved canon.
4. When the idea is ready, Claude emits a structured proposal (JSON) the frontend renders as the **Contribution Card.**

**System-prompt behavior (the AI's job):**
- "You are the guide to the NAP framework. You have its canon. Help this person shape their idea into a clear contribution."
- **Always** check the idea against the retrieved canon and tell the user plainly whether it already exists, partially exists, or is new — with links.
- If it exists → help them *strengthen* the existing principle (an `amendment`).
- If it's new → help them place it (which document) and structure it.
- Be a warm, rigorous thinking partner — sharpen weak ideas, ask clarifying questions, never flatter.
- **Never** claim to have changed the framework. End by producing the proposal for a human to review.

---

## 4. The Founding Members Wall

- Public page `/founders` (or `/builders`).
- Three recognition tiers:
  - **Founding Signatory** — added their name in support (verified email + opt-in).
  - **Contributor** — had at least one suggestion accepted into the framework.
  - **Architect** — made a major accepted contribution (Michael's discretion).
- **Attribution on the principle itself:** each shaped section shows "Shaped by [Name]" — the single most motivating detail in the whole system. Identity, not points.
- **The quality bar (guardrail):** you only appear on the wall after a *real* action — a verified endorsement or an accepted contribution. A small wall of real builders beats a giant wall of empty emails. The credibility of the wall protects the credibility of NAP.

---

## 5. Pages / Routes

| Route | Purpose |
|---|---|
| `/` | The Idea — plain-English home + the invitation |
| `/framework` | The 12 documents, browsable; each section addressable + shareable + "suggest a change" |
| `/framework/[doc]` | A single document |
| `/framework/[doc]#[section]` | Deep link to one principle (shareable) |
| `/shape` | The AI "Shape It" chat (also openable contextually from any section) |
| `/founders` | The Founding Members wall |
| `/changelog` | Public log of accepted changes — transparency = credibility |
| `/account` | Contributor's dashboard ("you've shaped 3 principles") |
| `/admin/review` | Moderation queue — Michael only |

---

## 6. Build Sequence (milestones)

- **M1 — Canon in the database.** Import the 12 docs as `canon_sections` + embeddings. *Also ships the public `/framework` pages and share-by-section.* Foundation for everything.
- **M2 — "Shape It" chat (read-only).** RAG chat that shapes ideas and checks them against the canon, ending in a Contribution Card. No auth yet — nail the *experience* first.
- **M3 — Identity + submission + queue.** Supabase Auth, contributor records, submission, and the `/admin/review` moderation queue.
- **M4 — The wall + attribution.** `/founders`, tiers, and "Shaped by [Name]" on accepted principles.
- **M5 — Contributor dashboard + the "living document" touches.** "You've shaped 3 principles," the wall visibly growing, the changelog.

---

## 7. Explicitly OUT of v1 Scope (anti-scope-trap)

These are good ideas for *later* — naming them here so they don't creep into v1 and stall the ship:
- Public voting / ranking of proposals
- Real-time collaborative editing
- The cascade animation + interactive 8-system seal (this is **v2 — the "soul" visual layer**)
- Email notifications / digests
- Multiple admins / a full Standards Council review workflow (v1 = Michael as sole curator)
- Contributor messaging / forums

---

## 8. Guardrails (carry these through every milestone)

1. **AI proposes, humans curate.** The canon is never auto-edited. Governance is the credibility.
2. **A real bar to the wall.** Quality of names over quantity.
3. **Dignity over gamification.** Animate the *meaning*, recognize the *contribution* — no points, badges, streaks, or leaderboards on a health framework.
4. **Honest framing, sitewide.** "An early-stage prototype, offered for review and shaping — not a finished standard, not medical advice." The honesty is the shield and the invitation.

---

*Prepared with Claude. Founder: Michael Andrew Feller Jones. v1 spec — a working draft to build from and revise.*
