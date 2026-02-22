import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";


/**
 * Stores the uploaded resume file in R2 as the source of truth.
 * Text extraction is handled client-side (pdfjs for PDFs, FileReader for text)
 * to avoid WASM compatibility issues in the Workers runtime.
 */
export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();

  const formData = await request.formData();
  const file = formData.get("resume") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const key = `resumes/${crypto.randomUUID()}/${file.name}`;

  await env.BUCKET.put(key, new Uint8Array(bytes), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  return NextResponse.json({ key });
}
