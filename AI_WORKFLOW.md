# AI workflow note

## Tooling

This project was built entirely with [Claude Code](https://claude.com/claude-code),
Anthropic's agentic CLI, across two sessions:

1. **Build session** — scaffolded and implemented the full application (backend
   routes, schema, access control, React frontend, editor, tests) against the
   assignment brief.
2. **This session (verify, document, deploy)** — installed dependencies fresh, ran the
   seed script and test suite, manually exercised every core flow in a real browser
   (create/rename/edit/format a document, upload a `.md` file, share it with a second
   seeded user and confirm the recipient sees it under "Shared with you" with the
   correct permission badge, reload to confirm persistence), fixed a dev-only port
   collision between the client and server, then wrote this documentation and handled
   deployment.

## How the brief was used

The assignment brief was treated as the spec, not a suggestion. Each of the five
numbered task sections (document creation/editing, file upload, sharing, persistence,
product/engineering quality) maps to a concrete, checkable piece of the codebase:

- Rich text requirements ("Bold, Italic, Underline, Headings, Lists") map directly to
  the exact button set in `client/src/components/Toolbar.jsx` — no more, no less.
- The brief's explicit permission to use "mocked auth" or "seeded accounts" is quoted
  verbatim in a code comment in `server/src/middleware/auth.js`, so the scope cut is
  traceable back to the requirement that authorized it, not left implicit.
- The sharing requirement's minimum bar ("a document owner, a way to grant access, a
  visible distinction between owned and shared") became the three things asserted most
  heavily in the test suite: ownership, the share endpoint, and the owned/shared split
  on the dashboard.

## Where AI output was checked, not just accepted

- **Automated tests as a gate, not a formality.** The 12-test Vitest/Supertest suite
  covers the access-control edge cases that are easy to get subtly wrong (404 vs 403
  for undisclosed documents, viewer-cannot-edit, only-owner-can-share/delete). These
  were run and confirmed passing (`npm run test`) before writing this note, not just
  assumed to work because the code looked right.
- **Manual browser verification, not just green tests.** Passing tests don't prove the
  UI is usable. In this session I ran the actual dev server and drove the app in a
  browser: typed and formatted text, confirmed bold/italic/underline/heading/list all
  visually applied, renamed a document, reloaded the page to confirm the rename and
  formatted content survived, shared a document from Alex to Jordan, switched accounts,
  and confirmed Jordan saw it under "Shared with you" with a "can edit" badge — the
  actual product-level behavior the brief asks reviewers to evaluate, not just the API
  contract.
- **A real bug caught by manual testing, not by the tests.** The Vitest suite talks to
  the Express app directly and never boots Vite, so it couldn't have caught this: in
  dev, the client dev server's port number was being injected as the server's `PORT`
  env var too, so both processes tried to bind the same port and the API silently
  404'd behind Vite's proxy. Fixed by pinning the server's dev port explicitly
  (`cross-env PORT=4000` in the root `dev:server` script) rather than trusting the
  ambient environment. This is exactly the kind of integration issue that only shows up
  when you actually run the full stack together, which is why "start the dev server
  and use the feature in a browser" was treated as a hard requirement here, not
  optional polish.
- **Production build smoke-tested before writing deployment docs.** `npm run build`
  followed by actually starting the server and curling both `/` (serves the built
  React app) and `/api/health` + `/api/users` confirmed the single-deployable-service
  architecture works end-to-end, before committing to describing that architecture in
  README.md/ARCHITECTURE.md.

## What AI did not decide unilaterally

Deployment target (Render) and repository setup (a new GitHub repo under the
developer's account) were confirmed with the developer before taking any action,
rather than assumed — both involve external accounts and irreversible-ish steps
(pushing code publicly, provisioning a hosted service) that aren't this tool's call to
make alone.
