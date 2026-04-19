GSTA-9 — Phase 4: Core pages & layout (Next.js App Router)
=========================================================

Status: in_progress
Issue: GSTA-9 (09a111bc-6dda-46c8-a167-433acf9ae655)
Workspace: test-ai-tools-project 2

This file is the locked technical execution plan for Phase 4: Core pages & layout.
It includes architecture decisions, file/route layout, key code snippets, failure modes,
test matrix, CI guidance, and ready-to-send Paperclip subtask JSON payloads and commands.

If you want me to create the Paperclip subtasks from this run, reply exactly with the word: POST
If you will run the create commands locally, reply: I WILL RUN
If you want me to stop and hand off the plan to the Staff Engineer without creating subtasks, reply: HANDOFF

1) Summary and Locked Decisions
--------------------------------
- Stack: Next.js App Router (v14+), TypeScript (strict), Tailwind CSS, Vitest + React Testing Library, Playwright + Axe for E2E/accessibility.
- Server components for layouts and initial data fetches; client components for interactivity (use "use client").
- Server-side session fetching and server-side auth gating for /dashboard routes.
- Use typed server helpers in lib/ (lib/api.ts, lib/auth.ts). Mutations trigger revalidatePath/revalidateTag.

2) File / Route Layout (canonical)
----------------------------------
app/
  layout.tsx                # root server layout (HTML shell, header/footer, session fetch)
  head.tsx
  globals.css
  loading.tsx               # global loading skeleton
  error.tsx                 # global error boundary
  page.tsx                  # home page
  components/
    Header.tsx              # client: nav, sign-in, hamburger
    Footer.tsx
    SearchBar.tsx
    ToolCard.tsx
    CategoryPills.tsx
    Pagination.tsx
  ai-tools/
    page.tsx                # all tools listing (filters, search, pagination)
    [slug]/page.tsx         # tool detail page
  ai-tool-category/
    [slug]/page.tsx
  new-arrivals/
    page.tsx
  submit-a-tool/
    page.tsx                # submit form (client component)
  api/
    submit-tool/route.ts    # server route to accept submissions

3) Key server component snippets
--------------------------------
Root layout (server component):

```tsx
// app/layout.tsx (server)
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { getServerSession } from '@/lib/auth'; // server-only helper

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        <a className="sr-only focus:not-sr-only" href="#content">Skip to content</a>
        <Header session={session} />
        <main id="content" className="min-h-[70vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

Dashboard layout (auth gated, server redirect):

```tsx
// app/dashboard/layout.tsx (server)
import { redirect } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { getServerSession } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect(`/auth/sign-in?callbackUrl=${encodeURIComponent('/dashboard')}`);
  return (
    <div className="min-h-screen flex">
      <Sidebar user={session.user} />
      <section className="flex-1 p-6">{children}</section>
    </div>
  );
}
```

Submit tool server route (example):

```ts
// app/api/submit-tool/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  // validate and sanitize inputs (name, url, email, description)
  // persist to DB or queue for moderation
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

4) Data fetching and cache strategy
----------------------------------
- Marketing pages: cache with revalidate: 3600 where appropriate.
- Listings and dashboards: dynamic server render; use next fetch with next: { revalidate: 10 } or tags.
- Mutations: use server actions or API routes and call revalidatePath / revalidateTag on success.

5) Auth and Trust Boundaries
---------------------------
- Server components may use server-only env vars and secrets. Never expose them to client bundles.
- Sessions: use secure cookie (HttpOnly, Secure, SameSite=strict). Rotate tokens server-side.

6) Accessibility & UX
---------------------
- Skip link, landmarks, keyboard navigation for header/menu, aria labels on all interactive elements.
- Color contrast WCAG AA, images with alt text, focus management after route changes.

7) Failure modes & mitigations
------------------------------
- API 5xx: show friendly error UI with retry and report telemetry.
- Partial data: skeletons for lists, local retry CTA for items.
- Submit failures: show inline errors and offer retry; optionally queue locally when offline.

8) Tests & QA matrix
--------------------
- Unit: Vitest + RTL for components and utils (target 90% component coverage).
- Integration: layout render tests, rendering under different session states.
- E2E: Playwright tests for major flows: home -> all-tools -> detail -> submit.
- Accessibility: Axe in Playwright for home, all-tools, detail, submit pages.

9) CI & Release
----------------
- GitHub Actions: lint -> typecheck -> unit tests -> build. Playwright runs on demand (PR label) or nightly.
- PR preview deploys via Vercel/GitHub integration; protect main with required passing checks + 1 staff review.

10) PR & Branching guidance
---------------------------
- Branch: gsta-9/phase4/<short-topic>
- Keep PRs small: one page or one cross-cutting change.
- PR checklist: typecheck, unit tests, screenshots, accessibility notes, reviewer name.

11) Definition of Done (for a page/feature)
-----------------------------------------
- Typechecks and builds.
- Unit tests for new components.
- E2E happy-path covered or flagged.
- Accessibility audit: no critical/high-severity violations.
- Mobile & desktop validated.

12) Paperclip subtasks (ready-to-send JSON)
------------------------------------------
Parent issue id: 09a111bc-6dda-46c8-a167-433acf9ae655
Project id: 036b3bc6-381d-4a3b-b0fb-7838cc0d636c
Workspace id: 189a6c48-c9aa-46b9-aa30-b9b6faf72bab

1) GSTA-9.1 Implement Root layout + header/footer (Staff Engineer)

```json
{
  "title": "GSTA-9.1 Implement Root layout + header/footer",
  "description": "Create app/layout.tsx, globals.css, Header and Footer components. Root layout must fetch server session and pass to child components. Include loading.tsx and error.tsx. Acceptance: typecheck, unit tests, mobile responsive, accessibility checks.",
  "parentId": "09a111bc-6dda-46c8-a167-433acf9ae655",
  "assigneeAgentId": "18026214-ed65-498e-bea5-0a89bab67c01",
  "status": "todo",
  "priority": "high",
  "projectId": "036b3bc6-381d-4a3b-b0fb-7838cc0d636c",
  "projectWorkspaceId": "189a6c48-c9aa-46b9-aa30-b9b6faf72bab"
}
```

2) GSTA-9.2 All Tools page (filters, cards, pagination) (Staff Engineer)

```json
{
  "title": "GSTA-9.2 All Tools page (filters, cards, pagination)",
  "description": "Implement app/ai-tools/page.tsx with filters (category, pricing, sort), ToolCard component, pagination controls, and 'Showing X of Y' counter. Tests for filters and ToolCard.",
  "parentId": "09a111bc-6dda-46c8-a167-433acf9ae655",
  "assigneeAgentId": "18026214-ed65-498e-bea5-0a89bab67c01",
  "status": "todo",
  "priority": "high",
  "projectId": "036b3bc6-381d-4a3b-b0fb-7838cc0d636c",
  "projectWorkspaceId": "189a6c48-c9aa-46b9-aa30-b9b6faf72bab"
}
```

3) GSTA-9.3 New Arrivals, category pages, and tool detail (Staff Engineer)

```json
{
  "title": "GSTA-9.3 New Arrivals, category pages, and tool detail",
  "description": "Implement app/new-arrivals, app/ai-tool-category/[slug], and app/ai-tools/[slug] (tool detail), with related tools section and breadcrumb. Tests for detail rendering.",
  "parentId": "09a111bc-6dda-46c8-a167-433acf9ae655",
  "assigneeAgentId": "18026214-ed65-498e-bea5-0a89bab67c01",
  "status": "todo",
  "priority": "high",
  "projectId": "036b3bc6-381d-4a3b-b0fb-7838cc0d636c",
  "projectWorkspaceId": "189a6c48-c9aa-46b9-aa30-b9b6faf72bab"
}
```

4) GSTA-9.4 Submit Tool form + server route (Staff Engineer)

```json
{
  "title": "GSTA-9.4 Submit Tool form + server route",
  "description": "Implement app/submit-a-tool/page.tsx (client form) and app/api/submit-tool/route.ts. Validate and sanitize inputs; show success and error states; include unit tests.",
  "parentId": "09a111bc-6dda-46c8-a167-433acf9ae655",
  "assigneeAgentId": "18026214-ed65-498e-bea5-0a89bab67c01",
  "status": "todo",
  "priority": "high",
  "projectId": "036b3bc6-381d-4a3b-b0fb-7838cc0d636c",
  "projectWorkspaceId": "189a6c48-c9aa-46b9-aa30-b9b6faf72bab"
}
```

5) GSTA-9.5 CI pipeline and preview deployment (Release Engineer)

```json
{
  "title":"GSTA-9.5 CI pipeline and preview deployment",
  "description":"Add GitHub Actions (lint, typecheck, unit tests, build). Configure preview deploys for PRs and main->prod. Add optional Playwright job on labeled runs.",
  "parentId":"09a111bc-6dda-46c8-a167-433acf9ae655",
  "assigneeAgentId":"c55fab5b-dc42-490e-834f-c3fe62114bc5",
  "status":"todo",
  "priority":"high",
  "projectId": "036b3bc6-381d-4a3b-b0fb-7838cc0d636c",
  "projectWorkspaceId": "189a6c48-c9aa-46b9-aa30-b9b6faf72bab"
}
```

6) GSTA-9.6 QA: Playwright E2E + accessibility checks (QA Engineer)

```json
{
  "title":"GSTA-9.6 QA: Playwright E2E + accessibility checks",
  "description":"Create Playwright E2E tests for sign-in (if used), home -> all tools -> tool detail -> submit tool. Run Axe accessibility checks for critical pages in CI.",
  "parentId":"09a111bc-6dda-46c8-a167-433acf9ae655",
  "assigneeAgentId":"e7bc455f-035e-46c2-a88c-a0abdcfea37b",
  "status":"todo",
  "priority":"high",
  "projectId": "036b3bc6-381d-4a3b-b0fb-7838cc0d636c",
  "projectWorkspaceId": "189a6c48-c9aa-46b9-aa30-b9b6faf72bab"
}
```

13) Paperclip create commands (PowerShell & curl)
-------------------------------------------------
PowerShell (Windows, uses env vars present in this workspace):

```powershell
$headers = @{ Authorization = "Bearer $env:PAPERCLIP_API_KEY"; "X-Paperclip-Run-Id" = $env:PAPERCLIP_RUN_ID }
$body = Get-Content './GSTA-9_SUBTASK.json' -Raw | ConvertFrom-Json # or build body inline

Invoke-RestMethod -Uri "$env:PAPERCLIP_API_URL/api/companies/$env:PAPERCLIP_COMPANY_ID/issues" -Method Post -Headers $headers -Body ($body | ConvertTo-Json -Depth 6) -ContentType "application/json"
```

curl (WSL / Linux / macOS):

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

Note: use the appropriate payload.json body for each subtask shown above.

14) Why create attempts failed from this run
------------------------------------------
- From this agent run I attempted POST /api/companies/... and POST /api/issues; both returned HTTP 500 with body {"error":"Internal server error"}.
- I verified the env vars (PAPERCLIP_API_KEY, PAPERCLIP_RUN_ID, PAPERCLIP_COMPANY_ID, PAPERCLIP_TASK_ID) and fetched agents and the parent issue successfully.
- Likely causes: server-side validation, missing optional fields expected by server, or a transient server bug. Adding projectId and projectWorkspaceId to the body may avoid validation errors (the JSON examples above include them).

15) Next actions and how to instruct me
--------------------------------------
- To let me retry creating the subtasks from this run, reply exactly: POST
- To run the PowerShell/curl commands yourself locally, reply: I WILL RUN — I'll stop retrying and remain available for questions.
- To hand off the plan and stop trying to create subtasks, reply: HANDOFF

If you don't reply within this session, engineers can pick up this file in the repo and use the JSON payloads + commands to create tasks.

-- End of plan
