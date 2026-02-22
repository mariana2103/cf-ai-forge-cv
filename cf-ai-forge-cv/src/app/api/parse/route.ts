import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ResumeData } from "@/lib/resume-types";


const SYSTEM_PROMPT = `You are an expert resume parser. Convert the raw resume text below into a structured JSON object.

Return ONLY a JSON object with this exact shape — no markdown, no explanation:
{
  "contact": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": ""
  },
  "summary": "",
  "experience": [
    {
      "id": "<short random id>",
      "company": "",
      "role": "",
      "dates": "",
      "bullets": [""]
    }
  ],
  "skills": [""],
  "education": [
    {
      "id": "<short random id>",
      "institution": "",
      "degree": "",
      "dates": "",
      "details": ""
    }
  ]
}

Rules:
- If a field is not present in the text, use an empty string or empty array.
- Generate short (6-char) random alphanumeric IDs for experience and education entries.
- skills should be a flat array of individual skill strings.
- bullets should be an array of strings, one per bullet point.`;

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();

  const { text } = (await request.json()) as { text: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Use the 3B model for extraction — sufficient for JSON structuring, much faster than 70B
  const response = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    max_tokens: 3000,
  });

  const raw = (response as { response: string }).response.trim();

  const jsonStr = raw.startsWith("```")
    ? raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    : raw;

  let resume: ResumeData;
  try {
    resume = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json(
      { error: "AI returned malformed JSON", raw },
      { status: 500 }
    );
  }

  return NextResponse.json({ resume });
}
