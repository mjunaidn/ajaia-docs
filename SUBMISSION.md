# Submission

Ajaia AI-Native Full Stack Developer take-home — Marginalia, a lightweight
collaborative document editor.

## What's included

- **Source code** — this repository: `client/` (React + Vite + Tiptap) and `server/`
  (Express + SQLite), an npm-workspaces monorepo.
- **[README.md](README.md)** — local setup/run instructions, feature list, file upload
  and testing notes, deployment details.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — architecture note: what was prioritized, key
  tradeoffs, and what would come next with more time.
- **[AI_WORKFLOW.md](AI_WORKFLOW.md)** — how AI (Claude Code) was used to build and
  verify this project.
- **This file (SUBMISSION.md)** — what's included, per this checklist.
- **Live product URL:** https://ajaia-docs-kkir.onrender.com (free Render instance —
  spins down after inactivity; first load after idle can take ~50s)
- **Test accounts (no passwords — mocked auth, see README):**
  - `alex@ajaia.test` — seeded owner of the demo document
  - `jordan@ajaia.test` — used to demonstrate the shared-with-you flow
  - `sam@ajaia.test` — third seeded account, unshared by default
- **Walkthrough video URL:** `<TODO: developer to record a short walkthrough and paste
  the URL here as a plain text file, per the assignment's deliverable list>`
- **Screenshots / demo GIF:** not included — local setup requires no steps beyond
  `npm install && npm run seed && npm run dev` (see README.md), so no extra-step
  walkthrough imagery is needed.

## What's working

- Document creation, rename, edit, autosave, and reopen.
- Rich text formatting: bold, italic, underline, H1/H2 headings, paragraph, bulleted
  and numbered lists.
- File upload: `.txt`, `.md`/`.markdown`, `.docx` → new editable document; unsupported
  types rejected with a clear error, stated in both the UI and README.
- Sharing: owner grants another seeded user "can view" or "can edit" access by email;
  dashboard visibly separates "Owned by you" from "Shared with you."
- Persistence: SQLite; documents, titles, formatting, and shares all survive a refresh.
- 12 automated tests (Vitest + Supertest) covering auth, CRUD, access control, and
  upload parsing — all passing.
- Single-service deployment: the Express server serves the built React app and the API
  from one process.

## What's incomplete / out of scope

- No real password-based authentication (mocked by design — explicitly permitted by
  the brief; see ARCHITECTURE.md for what real auth would require).
- No real-time collaborative editing (cursors/presence) — documents are single-editor
  at a time, last-write-wins on save.
- No document version history.
- No PDF/Markdown export.
- On Render's free tier, the SQLite file has no persistent disk, so data seeded/created
  during a review resets on redeploy or restart (documented in README.md).

## With another 2–4 hours, in priority order

1. Move persistence to Postgres, or attach a Render persistent disk, so the live demo
   survives redeploys.
2. Add basic version history (append-only snapshot on save).
3. Handle concurrent edits more gracefully than last-write-wins.
4. Export to PDF or Markdown (brief's stretch goal).
