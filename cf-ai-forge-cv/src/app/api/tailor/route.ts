import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ResumeData, HighlightedField } from "@/lib/resume-types";


const SYSTEM_PROMPT = `You are an expert resume tailoring agent. Your job is to rewrite a candidate's resume to closely match a given job description.

You will receive the candidate's current resume as JSON and the job description as text.
You may also receive a "masterProfile" — the candidate's full career history with ALL their experience, skills, and education ever recorded. When a masterProfile is provided, you should:
1. Draw from the masterProfile to add highly relevant experience, skills, or accomplishments missing from the current resume.
2. Select only the entries from the masterProfile that are most relevant to the JD (aim for a focused 1-page result).
3. Reorder or substitute bullets from the masterProfile to better align with the JD.

Return a JSON object with exactly this shape:
{
  "tailored": <the full updated ResumeData JSON>,
  "highlights": [{ "path": "<dot-notation path to changed field>", "type": "changed" }],
  "reasoning": [
    { "section": "<section name>", "change": "<what was changed>", "why": "<the reason>" }
  ]
}

Rules:
- Only rewrite what actually needs changing to match the JD. Don't change things for no reason.
- Strengthen bullet points with quantified metrics where plausible.
- Reorder skills so the most JD-relevant ones come first.
- Rewrite the summary to open with the candidate's strongest differentiator for THIS role.
- For highlights paths use: "summary", "skills", "experience.<id>.bullets.<index>" etc.
- reasoning entries must explain WHY each change aligns the resume to the JD.
- Return ONLY the JSON object, no markdown, no commentary.`;

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();

  const { resume, jobDescription, masterProfile } = (await request.json()) as {
    resume: ResumeData;
    jobDescription: string;
    masterProfile?: ResumeData | null;
  };

  if (!resume || !jobDescription?.trim()) {
    return NextResponse.json(
      { error: "resume and jobDescription are required" },
      { status: 400 }
    );
  }

  const masterSection = masterProfile
    ? `\n\nMASTER PROFILE (full career history — select the most relevant entries for this JD):\n${JSON.stringify(masterProfile, null, 2)}`
    : "";

  const userMessage = `RESUME JSON:\n${JSON.stringify(resume, null, 2)}\n\nJOB DESCRIPTION:\n${jobDescription}${masterSection}`;

  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 4096,
  });

  const raw = (response as { response: string }).response.trim();

  // Strip markdown code fences if the model wraps the JSON
  const jsonStr = raw.startsWith("```")
    ? raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    : raw;

  let parsed: {
    tailored: ResumeData;
    highlights: HighlightedField[];
    reasoning: { section: string; change: string; why: string }[];
  };

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json(
      { error: "AI returned malformed JSON", raw },
      { status: 500 }
    );
  }

  return NextResponse.json(parsed);
}
