import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ResumeData } from "@/lib/resume-types";

const SYSTEM_PROMPT = `You are ForgeCV's AI career coach — an expert in resume writing, ATS optimization, and job search strategy, embedded directly in the candidate's live resume editor.

You have access to:
- The candidate's current resume (structured JSON)
- Their personal background notes (bio) — may contain experience or skills not yet on the resume
- The target job description (if provided)

What you can do:
- Answer any question about resume strategy, ATS, LinkedIn, cover letters, or interview prep
- Rewrite or strengthen bullets using the Google X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]"
- Restructure sections (sectionOrder), reframe narratives, tailor for a specific role
- Add missing sections, remove irrelevant ones, surface skills mentioned in the bio
- Audit the resume for ATS risks, vague language, or weak impact statements — but ONLY when asked

Respond only to what the user asks. Do not volunteer unsolicited summaries, entry counts, or audits.

Resume schema:
- sectionOrder valid values: "summary" | "experience" | "skills" | "education" | "projects" | "certifications" | "awards" | "publications"
- skills: [{ "id": "", "label": "Programming Languages", "skills": ["Python"] }]
- All entry arrays have id fields — preserve them exactly when returning updatedResume

Content rules (non-negotiable):
- NEVER invent information. Every fact must come from the resume JSON or bio.
- If a bullet needs a metric that isn't available, rewrite it using the best partial X-Y-Z and note what the candidate should quantify.
- Preserve all existing entry IDs when returning updatedResume.

Editing rules (critical — violations break the UI):
- When the user asks to CHANGE, RENAME, or UPDATE a field: find that exact entry in the JSON by its id, modify only the requested field(s), and return the full resume with that entry updated in place. DO NOT add a new entry alongside the old one.
- When the user asks to DELETE an entry: remove it from its array. DO NOT keep it.
- When the user asks to ADD something new: append it to the correct array with a new unique id.
- The updatedResume must have the same number of entries as the current resume UNLESS the user explicitly asked to add or remove something.
- Never duplicate entries. If an experience, skill, or education already exists and you are asked to modify it, update it — do not create a copy.

Return ONLY this JSON — no markdown, no preamble:
When answering: { "reply": "<direct, concise answer>", "updatedResume": null }
When editing: { "reply": "<what changed — 1 sentence>", "updatedResume": { <ONLY the top-level keys you actually changed — e.g. if you only changed education, return just "education": [...]. Do NOT include sections you did not touch.> } }

Examples:
- Remove an education entry → { "reply": "Removed Bachelor of Computer Engineering.", "updatedResume": { "education": [<remaining entries only>] } }
- Add a skill → { "reply": "Added JavaScript to Programming Languages.", "updatedResume": { "skills": [<full skills array with new skill>] } }
- Change a job title → { "reply": "Updated role title.", "updatedResume": { "experience": [<all experience entries with the one title changed>] } }
- Edit summary → { "reply": "Rewrote summary.", "updatedResume": { "summary": "<new summary text>" } }

Tone: Direct, expert, and honest. No filler or sycophantic phrases. If the resume has real problems, name them clearly.`;

/** Attempt to close any unclosed brackets/braces so truncated JSON can parse. */
function repairJson(str: string): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of str) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  // If mid-string at truncation point, close the string first
  let result = str;
  if (inString) result += '"';
  return result + stack.reverse().join("");
}

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();

  const { messages, resume, jobDescription, bio } = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    resume: ResumeData;
    jobDescription?: string;
    bio?: string;
  };

  if (!messages?.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  // Limit history to last 6 messages to avoid context overflow
  const recentMessages = messages.slice(-6);

  // Compact JSON (no indentation) fits ~3x more data within the char cap
  const resumeRaw = JSON.stringify(resume);
  const resumeStr = resumeRaw.length > 6_000
    ? resumeRaw.slice(0, 6_000) + "...[truncated]"
    : resumeRaw;

  const contextParts = [
    `CURRENT RESUME JSON:\n${resumeStr}`,
    jobDescription?.trim() ? `JOB DESCRIPTION:\n${jobDescription.slice(0, 2_000)}` : null,
    bio?.trim() ? `USER BACKGROUND:\n${bio.slice(0, 1_000)}` : null,
  ].filter(Boolean);

  const primed = [
    { role: "user" as const, content: contextParts.join("\n\n---\n\n") },
    { role: "assistant" as const, content: '{"reply":"Got it — I\'ve read your resume. What would you like to work on?","updatedResume":null}' },
    ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...primed],
    max_tokens: 2048,
  });

  const aiText = (response as { response?: string | null }).response;
  if (typeof aiText !== "string" || !aiText) {
    return NextResponse.json({ reply: "I ran into an issue reaching the AI — please try again.", updatedResume: null });
  }
  const raw = aiText.trim();
  // Robust JSON extraction — handles preamble text, ```json fences, or bare JSON
  let jsonStr = raw;
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  } else if (!raw.startsWith("{")) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) jsonStr = raw.slice(start, end + 1);
  }

  let parsed: { reply: string; updatedResume: ResumeData | null };
  try {
    // First try as-is; if it fails, attempt bracket repair for truncated output
    let parseTarget = jsonStr;
    try { JSON.parse(jsonStr); } catch { parseTarget = repairJson(jsonStr); }
    parsed = JSON.parse(parseTarget);
    if (parsed.updatedResume) {
      // Merge partial AI response into the original resume so a model that only returns
      // the changed section (e.g. just "skills") cannot wipe out the rest of the canvas.
      parsed.updatedResume = {
        contact:        { ...resume.contact, ...(parsed.updatedResume.contact ?? {}) },
        summary:        parsed.updatedResume.summary        ?? resume.summary,
        sectionOrder:   parsed.updatedResume.sectionOrder   ?? resume.sectionOrder,
        experience:     parsed.updatedResume.experience     ?? resume.experience,
        skills:         parsed.updatedResume.skills         ?? resume.skills,
        education:      parsed.updatedResume.education      ?? resume.education,
        projects:       parsed.updatedResume.projects       ?? resume.projects       ?? [],
        certifications: parsed.updatedResume.certifications ?? resume.certifications ?? [],
        awards:         parsed.updatedResume.awards         ?? resume.awards         ?? [],
        publications:   parsed.updatedResume.publications   ?? resume.publications   ?? [],
      };
    }
  } catch {
    // Try to extract the reply field even if the overall JSON was truncated
    const replyMatch = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    parsed = {
      reply: replyMatch?.[1] ?? "I couldn't apply that edit — please try again with a simpler request.",
      updatedResume: null,
    };
  }

  return NextResponse.json(parsed);
}
