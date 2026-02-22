import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import pdf from "pdf-parse";

export const runtime = "edge";

// Section headers to look for when structuring the parsed PDF text
const SECTION_HEADERS = [
  "summary",
  "objective",
  "experience",
  "work experience",
  "work history",
  "education",
  "skills",
  "technical skills",
  "projects",
  "certifications",
  "awards",
  "publications",
  "languages",
];

function parseSections(text: string): Record<string, string[]> {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const sections: Record<string, string[]> = {};
  let currentSection = "header";
  sections[currentSection] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const matched = SECTION_HEADERS.find(
      (h) => lower === h || lower === h + ":" || lower.startsWith(h + " ")
    );

    if (matched) {
      currentSection = matched;
      sections[currentSection] = [];
    } else {
      sections[currentSection].push(line);
    }
  }

  return sections;
}

export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext();

  const formData = await request.formData();
  const file = formData.get("resume") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "File must be a PDF" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Store the original PDF in R2 as the source of truth
  const key = `resumes/${crypto.randomUUID()}/${file.name}`;
  await env.BUCKET.put(key, buffer, {
    httpMetadata: { contentType: "application/pdf" },
  });

  // Parse the PDF into structured sections
  const parsed = await pdf(buffer);
  const sections = parseSections(parsed.text);

  return NextResponse.json({
    key,
    pageCount: parsed.numpages,
    sections,
  });
}
