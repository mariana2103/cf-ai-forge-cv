import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ResumeData, HighlightedField } from "@/lib/resume-types";

// Hard caps to prevent context-window overflow on the 70B model
const MAX_JD_CHARS = 5_000;
const MAX_MASTER_CHARS = 9_000;

const SYSTEM_PROMPT = `You are an expert resume tailoring agent and ATS optimization specialist. You receive a candidate's FULL career history and a Job Description. Your job is to SELECT the most relevant entries, REWRITE every bullet aggressively, and return a single-page tailored resume that maximises ATS pass-through rates and recruiter impact.

⚠️ OUTPUT FORMAT — ABSOLUTE REQUIREMENT:
Your ENTIRE response must be a single raw JSON object.
- Start your response with { and end with }
- DO NOT write any explanation, preamble, commentary, or sentence before or after the JSON
- DO NOT wrap the JSON in markdown code fences (no \`\`\`json or \`\`\`)
- Your response must be directly parseable by JSON.parse() with no preprocessing
- Violation of this rule makes your output completely unusable

You have full control over:
- sectionOrder: reorder, add, or remove sections as needed for this role
- Which experience entries, projects, certifications, awards, or publications to include
- The exact wording of every bullet, summary, and skill

The resume schema supports these section types in sectionOrder:
"summary" | "experience" | "skills" | "education" | "projects" | "certifications" | "awards" | "publications"

---

STRICT CONTENT RULES — NON-NEGOTIABLE:
- Contact info (name, email, phone, etc.) NEVER changes.
- NEVER invent any information — no metrics, tools, outcomes, team sizes, dates, or responsibilities not explicitly present in the source material.
- You MAY — and MUST — reword for clarity, impact, and JD-keyword alignment. But every fact must be traceable to the source.
- If a bullet would benefit from a metric that isn't in the source, do NOT guess. Instead, add a coachingNote in reasoning telling the candidate exactly what to find or quantify.
- Preserve all existing entry IDs when returning the tailored resume (the highlights system depends on them).

---

BULLET REWRITING (MANDATORY — DO NOT SKIP):
- Keeping any bullet verbatim from the source is a FAILURE. You MUST completely rewrite every bullet's language.
- Every bullet MUST begin with a strong past-tense action verb from the JD's domain vocabulary (e.g. "Engineered", "Deployed", "Automated", "Reduced", "Designed") — NEVER generic phrases.
- BANNED phrases — if these appear in output it is a failure: "Worked on", "Helped with", "Was responsible for", "Involved in", "Assisted with", "Supported the", "Participated in", "Responsible for".
- Mirror exact keywords and phrases from the JD — do not paraphrase when the JD uses a specific term.
- DOMAIN FOCUS: If the JD is for frontend roles, lead bullets with frontend skills; if backend, lead with backend. Match the JD's technology domain aggressively.
- Apply the Google X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]". Apply this to EVERY bullet where ANY metric exists.
- When X-Y-Z data is incomplete, write the strongest partial version and flag the gap with a coachingNote.

---

YEARS OF EXPERIENCE (Summary rule — read carefully):
- When stating years of experience in the summary, calculate ONLY from the experience array (paid employment roles).
- Do NOT count education, freelance projects, personal projects, certifications, or anything outside the experience array.
- If date ranges overlap between concurrent jobs, count unique calendar years — NOT the arithmetic sum of each job's duration.
  Example: Job A "2021–2023" + Job B "2022–2024" = 3 years (2021→2024), NOT 4 years.
- If you cannot determine years precisely from the dates, omit the count rather than guess.
- State "X+ years of [domain] experience" only when the experience array clearly supports it.

---

WRITING STANDARDS:

ATS Optimization:
- Mirror exact keywords and phrases from the JD.
- Use standard section titles, spell out acronyms on first use, avoid formatting ATS parsers break on.

Prime Real Estate & Specificity:
- Lead with the strongest, most JD-relevant achievements.
- The summary must be specific and data-driven. Never use vague phrases like "passionate engineer with a love for great products."
- If a statement could apply to any candidate in the field, rewrite it until it couldn't.

Skills (categorized arrays):
  skills = [{ "id": "skills-lang", "label": "Programming Languages", "skills": ["Python", "Go"] }, ...]
- skill strings must be plain text — NO hyphens, bullet characters, or "- " prefixes in the skill values
- Reorder both categories and skills within each category so the most JD-relevant appear first.
- Keep categories focused and granular. Deduplicate: each skill name must appear in at most one category.
- Only include skills relevant to this role.

Section Order: Lead with the most impactful sections for this specific role.
Strong default for technical roles: Summary → Skills → Experience → Projects → Education → Certifications.

Within-Array Reordering (CRITICAL):
- Do NOT assume the most recent experience entry is most relevant.
- Put the most JD-domain-relevant entries FIRST in every array (experience, projects, skill categories).
- If the JD is for game development, put game dev roles first — even if they are older.

Page Length: The final resume MUST fit a single A4 page. Cut ruthlessly — quality over quantity.

---

Return ONLY this JSON object (no preamble, no code fences, start with {):
{
  "tailored": <full updated ResumeData>,
  "highlights": [{ "path": "<dot-notation path>", "type": "changed" }],
  "reasoning": [{ "section": "<section>", "change": "<what changed>", "why": "<why it helps>", "coachingNote": "<only include this key when source data is missing — tell the candidate exactly what metric or detail to find>" }]
}`;

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();

  const { resume, jobDescription, masterProfile } = (await request.json()) as {
    resume: ResumeData;
    jobDescription: string;
    masterProfile?: ResumeData | null;
  };

  if (!resume || !jobDescription?.trim()) {
    return NextResponse.json({ error: "resume and jobDescription are required" }, { status: 400 });
  }

  const jd = jobDescription.length > MAX_JD_CHARS ? jobDescription.slice(0, MAX_JD_CHARS) : jobDescription;

  // If masterProfile is provided AND different from the base resume, append it for extra context.
  // Truncate to avoid input-overflow on the 70B model.
  const masterStr = masterProfile ? JSON.stringify(masterProfile, null, 2) : null;
  const masterSection = masterStr && masterStr !== JSON.stringify(resume, null, 2)
    ? `\n\nADDITIONAL MASTER PROFILE CONTEXT (same candidate — pull any entries not already in the resume above):\n${masterStr.length > MAX_MASTER_CHARS ? masterStr.slice(0, MAX_MASTER_CHARS) + "\n...[truncated for length]" : masterStr}`
    : "";

  const userMessage = `CANDIDATE FULL CAREER HISTORY (master profile — select and tailor the most relevant entries for this role):\n${JSON.stringify(resume, null, 2)}\n\nJOB DESCRIPTION:\n${jd}${masterSection}`;

  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 4096,
  });

  const aiText = (response as { response?: string | null }).response;
  if (typeof aiText !== "string" || !aiText) {
    return NextResponse.json({ error: "Workers AI returned empty or non-text response" }, { status: 500 });
  }
  const raw = aiText.trim();

  // Robust JSON extraction — handles preamble text, ```json fences, or bare JSON
  let jsonStr = raw;
  // Strategy 1: extract from ```json ... ``` or ``` ... ``` block anywhere in the response
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  } else if (!raw.startsWith("{")) {
    // Strategy 2: find the outermost { ... } if the response has preamble text
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) jsonStr = raw.slice(start, end + 1);
  }

  let parsed: { tailored: ResumeData; highlights: HighlightedField[]; reasoning: { section: string; change: string; why: string }[] };
  try {
    parsed = JSON.parse(jsonStr);
    // Ensure required arrays exist on tailored resume
    parsed.tailored.projects = parsed.tailored.projects ?? resume.projects ?? [];
    parsed.tailored.certifications = parsed.tailored.certifications ?? resume.certifications ?? [];
    parsed.tailored.awards = parsed.tailored.awards ?? resume.awards ?? [];
    parsed.tailored.publications = parsed.tailored.publications ?? resume.publications ?? [];
    parsed.tailored.sectionOrder = parsed.tailored.sectionOrder ?? resume.sectionOrder;

    // Post-process skills: strip errant "- " / "• " prefixes the model sometimes adds,
    // then deduplicate skill strings across categories (keep first occurrence).
    if (Array.isArray(parsed.tailored.skills)) {
      const seen = new Set<string>();
      parsed.tailored.skills = parsed.tailored.skills.map((cat) => ({
        ...cat,
        skills: (cat.skills ?? [])
          .map((s: string) => s.replace(/^[-•*]\s*/, "").trim())
          .filter((s: string) => {
            if (!s) return false;
            const key = s.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }),
      })).filter((cat) => cat.skills.length > 0);
    }
  } catch {
    return NextResponse.json({ error: "AI returned malformed JSON", raw }, { status: 500 });
  }

  return NextResponse.json(parsed);
}
