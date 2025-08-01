Poppy is a Next.js, RAG-driven platform that helps Product Managers draft PRDs, generate mock designs, decompose work for engineering, and act as their operating system from idea → shipped feature.
0. Golden Rules (read these before replying)
Produce small, composable modules.
UI components ≤ 120 LOC each.
Server utilities ≤ 80 LOC each.
If code grows, first propose a sub-component split.
Conform to the tooling, or the MR is rejected. • TypeScript strict mode, ESLint (airbnb-typescript), Prettier, Husky, Jest + React Testing Library, Playwright. • All code you output must pass pnpm lint && pnpm test.
Follow the project folder conventions in §2. Do not invent your own structure unless asked.
Treat unknowns explicitly: list questions, assumptions, and validation steps at the top of each answer.
Every response ends with an “Apply & Test” block: • exact files created/edited • commands to run • expected console / browser output
1. System Overview (the 2-minute tour)
• Front-end: Next.js 14 / React-server-components / Tailwind. • Back-end: Next.js route handlers + LangChain 0.2 + tRPC. • Vector store: Supabase PGVector. • Auth: Clerk. • Third-party APIs: OpenAI (GPT-4o), Google Docs, GitHub. • CI: GitHub Actions (ci.yml contains the pipeline).
Diagram: client ⇄ /api/trpc ⇄ services/ ─┐ ├─ langchain/ ── openai.ts ├─ lib/db.ts (Supabase) └─ lib/docs.ts (Google Docs)
2. Project Layout (source/**)
• app/ ← Next.js routes / pages • (site)/ ← public-facing marketing pages • dashboard/ ← authenticated PM workspace • features/ ← feature object UI • [featureId]/ ← dynamic RSC route • edit/ ← inline PRD editor etc.
• components/ui/ ← atomic RSC/CSR components • components/composite/ ← glue components, ≥2 atoms • lib/ ← framework-agnostic helpers • services/ ← business logic, may call lib/ • langchain/ ← RAG chains & embeddings • tests/ ← jest/unit; playwright/e2e • docs/Claude.md ← THIS file
3. Coding Standards Cheat-sheet
• Type everything (strictNullChecks). • Prefer Zod for runtime schemas; generate TS types. • One React hook per concern. • Never fetch data directly inside components; use getFeatureServerProps helpers in services/. • Server actions: suffix action.ts. • Use swr only for truly dynamic data. • Commit messages: Conventional Commits (feat:, fix:, …).
4. Ready-made Prompt Recipes (you call these in tickets)
a: “Add a small field to an existing object”
Copy → paste into ClaudeCode:
# Ticket: Short description here ## Scope Object: Feature New field: impactScore: 0-5 (int) ## Acceptance 1. Shown in Feature > Summary panel 2. Stored in DB, returned by tRPC `feature.byId` 3. Editable only by PM role
Claude behaviour: • Replies with migration, Prisma model change, API diff, UI wire, tests, and “Apply & Test” block.
b: “Design a green-field module”
# Ticket: Brainstorm competitor insights module ## Must-haves - Schema sketched below - Vector store retrieval - MVP UI (read-only) ## Nice-to-have - Slack notification hook
Claude should first return a design proposal (not code) that we approve, then proceed.
5. Edge-guardrails
• LLM tokens are billable → chunk input, stream outputs. • PII must never be persisted in vector db (use redactPII() in lib/). • For Google Docs imports, enforce mime-type whitelist.
6. Knowledge Base Anchors
When you need domain docs, call:
import { getDoc } from '@/lib/docs' const prdTemplate = await getDoc('prd_template_v2'); // GDoc ID
Docs that ClaudeCode can cite (embed IDs only): • PRD_TEMPLATE_V2 • DESIGN_GUIDELINES_V1 • ENGINEERING_CHECKLIST_V3