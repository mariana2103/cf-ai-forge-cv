# ForgeCV — Edge-First AI Resume Engine

> Parse, tailor, and export a job-specific resume in under 60 seconds. All entirely on the Cloudflare Global Network.

**Live demo:** [cf-ai-forge-cv.mariana-almeida.workers.dev](https://cf-ai-forge-cv.mariana-almeida.workers.dev)

---

## Try it locally

```bash
git clone https://github.com/mariana2103/cf-ai-forge-cv
cd cf-ai-forge-cv
npm install
npm run dev          # local Next.js dev server (no Workers AI — use deployed link for AI features)
```

To run the full Cloudflare stack locally (Workers AI, R2, D1):

```bash
npm run preview      # builds with opennextjs-cloudflare and runs wrangler dev
```

To deploy your own instance:

```bash
# 1. Create resources
npx wrangler d1 create forgecv-db
npx wrangler r2 bucket create forgecv-resumes

# 2. Deploy the workflow worker first, then the main app
npm run deploy
```

> Workers AI and R2 require a Cloudflare account with those products enabled. D1 activates automatically.

---

## The Problem

Every career advisor says the same thing: *tailor your resume to the job description.* In practice this means:

- **30–60 minutes per application** manually re-reading a JD, picking keywords, and rewriting bullet points
- **ATS ghosting** because you wrote "Management" and the JD said "Orchestration"
- **Master CV paralysis** — 5+ years of experience means 20+ bullet points to choose from for every single role

ForgeCV removes the manual loop. Upload once, tailor in seconds, download a clean PDF.

---

## How It Works

### 1. Ingest
Drop a PDF or paste raw text. The browser extracts the content with `pdfjs-dist`, sends plain text to a Cloudflare Worker, and **Llama 3.2-3B** structures it into a typed JSON resume schema, preserving every role, bullet, and date exactly as written.

### 2. Live Edit
The parsed resume renders immediately as an editable canvas. Click any field to edit inline. Add, remove, or reorder sections. The right panel is always the source of truth, the JSON follows your edits in real time.

### 3. AI Tailor
Paste a Job Description and hit **Tailor for JD**. A Cloudflare Workflow runs **Llama 3.2-3B** against your master career history (not the current canvas state) plus the JD. The agent:
- Selects the most relevant experience entries and projects
- Rewrites every bullet using the JD's exact domain vocabulary and the Google X-Y-Z impact formula
- Reorders sections and skills for maximum ATS impact
- Returns a `reasoning` log explaining every decision

Changed fields are highlighted amber on the canvas. The agent's reasoning appears in the chat panel.

### 4. Export
Click **Export PDF** to generate a pixel-perfect PDF from the current canvas state — template-aware, accent-color-aware, all 8 section types supported.

---

## Technical Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 via `@opennextjs/cloudflare` | App Router, edge runtime |
| Runtime | Cloudflare Workers (V8 Isolates) | 0ms cold starts |
| Database | Cloudflare D1 (SQLite at the edge) | Bound, provisioned (version history pending) |
| Storage | Cloudflare R2 | Source PDF storage |
| AI — Parsing | `@cf/meta/llama-3.2-3b-instruct` | Fast structured extraction |
| AI — Tailoring | `@cf/meta/llama-3.2-3b-instruct` via Workflow | Durable async step, retryable |
| UI | Tailwind CSS v4 + Shadcn UI | Zinc/slate dark + light theme |
| PDF Extraction | `pdfjs-dist` (browser-side) | WASM runs in browser, not Worker |

---

## Features

- **Hybrid ingestion** — PDF drag-and-drop or raw text paste
- **Master Profile** — parsed resume stored separately; every tailor session starts from the original, not the last canvas state
- **3 resume templates** — Harvard, Rezi, Rezi+ (with live accent color picker)
- **8 section types** — Summary, Experience, Skills, Education, Projects, Certifications, Awards, Publications
- **AI-driven section reordering** — the agent controls `sectionOrder` based on JD domain
- **Amber highlights** — every AI-changed field visually marked on the canvas
- **Reasoning log** — the agent explains every structural and wording decision in the chat
- **Session persistence** — 7-day localStorage TTL; resume, template, accent color, chat history all survive a refresh
- **Light/dark mode** — CSS-variable-only swap, zero component changes

---

## Implementation Roadmap

### Phase 1 — Cloudflare Native Setup
- [x] Initialize with `create-cloudflare@latest --framework=next`
- [x] Bind Worker to D1 and R2 via `wrangler.jsonc`
- [x] Run `cf-typegen` for typed bindings (`env.AI`, `env.DB`, `env.BUCKET`)

### Phase 2 — Parser & UI 
- [x] Drag-and-drop zone via `react-dropzone` (PDF + TXT)
- [x] Client-side PDF text extraction via `pdfjs-dist`
- [x] `POST /api/upload` stores raw file in R2
- [x] `POST /api/parse` structures raw text into Resume JSON via Workers AI
- [x] Dual-pane workspace: left command panel + right live canvas

### Phase 3 — AI Logic 
- [x] `POST /api/tailor` — gap analysis + rewrites via Cloudflare Workflow + Llama 3.2-3B
- [x] Reasoning Agent: every change returns a `{ section, change, why }` log
- [x] Highlights system: changed fields turn amber on the canvas

### Phase 4 — Export & Polish 🔄
- [x] PDF export — `buildPrintHtml` with full schema support, all 8 sections, `sectionOrder`-driven, template-aware
- [x] 3-template system with live accent color picker
- [x] Master Profile viewer/editor with JSON editor, Load into Canvas / Clear actions
- [x] Session persistence — 7-day TTL snapshot in localStorage
- [x] Light/dark mode toggle
- [ ] Version History tab backed by D1
- [ ] SSE streaming for real-time AI output

---

## Why Cloudflare?

1. **Latency** — AI inference runs in the same data center where the request lands. No round-trip to a third-party LLM API.
2. **Privacy** — User data stays within Cloudflare's network perimeter. Nothing is sent to OpenAI, Anthropic, or any external provider.
3. **Cost** — Workers AI is a fraction of the cost of hosted LLM APIs plus managed database hosting.

---

## Engineering log

`docs/ENGINEERING_LOG.md` documents 21 real technical hurdles from the build — WASM crashes in Workers, Workflow retry cascades, LLM preamble text breaking JSON parsing, schema migrations, and more.

Selected entries:

- **Hurdle #4** — Why PDF parsing moved from the Worker to the browser
- **Hurdle #18** — How tailoring sessions were compounding instead of resetting to master
- **Hurdle #21** — Three-strategy JSON extractor to survive LLM output format failures
