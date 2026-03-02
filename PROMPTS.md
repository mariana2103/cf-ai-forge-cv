# PROMPTS.md — AI Prompts Used in ForgeCV

---

## How this project came to be submitted

ForgeCV was not built for this assignment. It started as a personal project. I wanted a tool that would actually tailor a resume properly instead of just reordering bullet points superficially. I had been thinking about the idea for a while and chose the Cloudflare stack because I wanted to learn edge computing properly, not because of any assignment.

When I was filling out the Cloudflare internship application and got to the optional assignment section, I read the four criteria and stopped: LLM, Workflow coordination, user input via chat, memory and state. That was exactly what I had been building. The project was already deployed and working. I thought, why not submit it.

The honest caveat: the AI parts of this app still have real problems. The smaller model (3B) does not follow complex formatting instructions reliably. The tailoring output is inconsistent so sometimes it rewrites bullets well, sometimes it barely changes them, sometimes it produces malformed JSON that the fallback parser has to recover. The summary field sometimes gets calculated experience years wrong. These are documented in the engineering log. The app works and produces useful output, but it is not polished enough that I would call the AI behaviour solved.

---

## Development approach

I built this with heavy use of **Claude Code** (Anthropic's AI coding CLI). Claude Code wrote most of the implementation code: the routes, the components, the Cloudflare Workflows integration, the TypeScript types, the CSS theming. My role was directing the architecture, debugging the things Claude got wrong, understanding every constraint that came up (especially the Cloudflare-specific ones), and deciding when to change approach entirely.

I first generated the initial UI layout, which I then adapted for the Cloudflare stack.

---

## Claude Code prompts (approximate, in order)

These are roughly what I was saying to Claude Code during the build. Not exact transcripts but close enough. I was figuring things out as I went.

**Getting started**
> "i want to build a resume tailoring tool on cloudflare, set up nextjs with opennextjs/cloudflare and add workers ai d1 and r2 bindings"

**After generating the UI from v0 and everything broke**
> "ok so i copied the ui and now there are two package.jsons and random config files inside src, merge everything into the root and make it build"

**PDF parsing crashing in the worker**
> "pdfjs is crashing in the worker, i think its wasm, can we just do the pdf parsing in the browser and send the text to the api instead"

**Parse route**
> "write the /api/parse route, it should take the resume text and call workers ai llama 3b to get it back as json, the model keeps adding text around the json so make it handle that"

**Types were getting messy**
> "the resume types are all over the place, can you define a proper ResumeData type with everything, contact, summary, experience, skills (grouped not flat), education, projects etc, and add a sectionOrder field so the ai can control the order"

**State was getting lost on refresh**
> "the resume disappears on refresh, store it in localstorage with a 7 day ttl, and keep the original parsed resume separate from what the user is editing so we can always go back to the original for tailoring"

**Canvas**
> "build the canvas that shows the resume and lets you edit it inline, it needs to support all the section types and let you reorder them"

**Tailor route**
> "write /api/tailor, it takes the resume and a job description and calls the 70b model to rewrite the resume for the job, return what changed and why"

**Tailoring was getting worse every session**
> "i ran tailor twice on the same resume and the second time it was way worse, i think its tailoring the already-tailored version instead of the original, we need to always send the original parsed resume as the base and never the canvas state"

**AI was not actually doing anything**
> "the ai is just copying the bullets as is, not rewriting them at all, and its putting things in the wrong order and getting the years of experience wrong because i had overlapping jobs, fix the prompt"

**70B was timing out**
> "the 70b model is too slow and the worker is timing out, can we use cloudflare workflows so it doesnt die, and switch to the 8b model"

**The workflow couldn't live in the main worker**
> "i tried to add the workflow class to the main worker but opennextjs compiles everything into a single worker.js and you can't export a WorkflowEntrypoint from that, we need a separate wrangler config and a second deployed worker just for the workflow right"

**8B was also timing out**
> "the 8b is also timing out inside the workflow step, switch to 3b and cut the retries to 1, the quality is fine enough"

**AI was returning broken json**
> "sometimes the model just cuts off mid json because it hit the token limit, write something that tries to fix it before parsing, like close any open brackets"

**App crashed in production**
> "the whole app is broken in production, browser console says ReferenceError: Can't find variable: __name, nothing loads, find what's causing it and fix it"

**Color change**
> "change the accent color to cloudflare blue/teal, the current orange is weird in dark mode"

---

## LLM system prompts (production)

These are the actual system prompts currently in the codebase.

### Parse route (`/api/parse`) — `@cf/meta/llama-3.2-3b-instruct`

```
You are an expert resume parser. Convert raw resume text into a structured JSON object.

CRITICAL RULES — violating these is a failure:
1. NEVER invent, guess, or fabricate ANY information not present in the source text.
2. Extract ONLY what is explicitly written. Missing fields → "" or [].
3. Copy bullet points verbatim. Normalize whitespace and bullet punctuation (–, —, •) to a plain hyphen, but change nothing else.
4. Extract ALL experience entries, ALL education, ALL skills — do not truncate. Missing even one is a failure.
5. For each experience entry: copy the EXACT job title/role as written — do not paraphrase or generalize.
6. Use sectionOrder to reflect the actual order sections appear in the resume.
7. Add a section to sectionOrder ONLY if it appears in the source text.
8. Generate short (6-char) random alphanumeric IDs for all entries.
9. Copy dates exactly as written — do not normalize or reformat.

SUMMARY FIELD:
- Captures any introductory block at the top regardless of heading.
- Common headings: "Summary", "About", "Objective", "Profile", "Overview", "Career Objective", "Personal Statement".
- If there is such a block with no heading, still copy it.
- Only leave summary as "" if the resume has zero introductory text.

SKILLS FORMAT:
- Group into focused categories reflecting the source text.
- Prefer specific labels ("Databases", "Cloud & DevOps") over catch-alls ("Tools").

Return ONLY this JSON — no markdown, no explanation:
{
  "contact": { "name": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "" },
  "summary": "",
  "sectionOrder": ["summary", "experience", "skills", "education"],
  "experience": [{ "id": "", "company": "", "role": "", "location": "", "dates": "", "bullets": [] }],
  "skills": [{ "id": "", "label": "Programming Languages", "skills": [] }],
  "education": [{ "id": "", "institution": "", "degree": "", "dates": "", "details": "" }],
  "projects": [{ "id": "", "name": "", "description": "", "dates": "", "bullets": [] }],
  "certifications": [{ "id": "", "name": "", "issuer": "", "date": "", "details": "" }],
  "awards": [{ "id": "", "name": "", "description": "", "date": "" }],
  "publications": [{ "id": "", "title": "", "venue": "", "date": "", "description": "" }]
}
```

### Tailor Workflow (`workflow-worker.ts`) — `@cf/meta/llama-3.2-3b-instruct`

```
You are an expert resume strategist specializing in ATS optimization and resume tailoring.

OUTPUT FORMAT — ABSOLUTE REQUIREMENT:
- Your response MUST start with { and end with }
- Return ONLY the JSON object — no markdown fences, no preamble, no explanation
- Any response that does not start with { is a failure

YOUR TASK:
Given a candidate's full career history and a target job description, produce a tailored resume that:
1. Selects and reorders sections/entries to best match the JD
2. Rewrites every bullet using the JD's exact domain vocabulary
3. Highlights the most relevant skills and experience

BULLET REWRITING (MANDATORY):
- Every bullet MUST be rewritten. Copying verbatim is a failure.
- Use the Google X-Y-Z formula: "Accomplished [X] as measured by [Y] doing [Z]"
- Start with a strong action verb. Never use: "Worked on", "Helped with", "Was responsible for"

WITHIN-ARRAY REORDERING:
- Do NOT default to most-recent-first. Lead with the most JD-relevant entry.
- Apply domain-first logic across experience, projects, and skills.

SKILLS:
- Skill strings must be plain text — NO hyphens, bullet characters, or "- " prefixes.

YEARS OF EXPERIENCE:
- Count ONLY from paid positions. For overlapping jobs, count unique calendar years, not the arithmetic sum.

Return ONLY:
{
  "tailored": { ...complete ResumeData... },
  "highlights": [{ "path": "experience.ID.bullets.0", "type": "rewritten" }],
  "reasoning": [{ "section": "Experience", "why": "..." }]
}
```

### Chat route (`/api/chat`) — `@cf/meta/llama-3.2-3b-instruct`

```
You are ForgeCV's resume editing assistant. The user has uploaded their resume and can ask you
to make changes in natural language.

RESPONSE FORMAT — MANDATORY:
{
  "reply": "Conversational explanation of what changed and why",
  "updatedResume": { ...complete updated ResumeData, or null if no changes needed... }
}

Rules:
- If making changes, return the COMPLETE resume — not just the changed section.
- Never invent experience not present in the source.
- Return ONLY the JSON object — no markdown fences, no preamble.
```

---

## Known AI problems that still exist

The prompts above are the result of many iterations. These issues remain unsolved:

- **Instruction following is inconsistent.** The 3B model sometimes rewrites bullets well, sometimes barely changes them. The same prompt produces different quality on different runs with no clear pattern.
- **JSON truncation.** On longer resumes the model hits the token limit mid-response. The `repairJson()` fallback recovers a parseable object but the tailored content is cut off.
- **Skills formatting.** Despite explicit instructions, the model occasionally still prefixes skills with `"- "` or duplicates them across categories.
- **Summary experience calculation.** The model still sometimes gets years of experience wrong when roles overlap.
- **The tailoring is only as good as the 3B model allows.** The 70B model would produce substantially better rewrites but its inference time inside a Cloudflare Workflow step causes retry cascades. This is the main quality ceiling of the current implementation.
