import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ResumeData } from "@/lib/resume-types";
import type { TailorParams } from "@/lib/tailor-core";

// The TAILOR_WORKFLOW binding is added to wrangler.jsonc but not yet reflected in
// the auto-generated cloudflare-env.d.ts — extend the env type inline until the
// next `npm run cf-typegen` run regenerates the types file.
type EnvWithWorkflow = CloudflareEnv & {
  TAILOR_WORKFLOW: Workflow<TailorParams>;
};

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext() as unknown as { env: EnvWithWorkflow };

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

  // Create a unique ID for this tailor job so the frontend can poll for it.
  const jobId = crypto.randomUUID();

  try {
    await env.TAILOR_WORKFLOW.create({
      id: jobId,
      params: { resume, jobDescription, masterProfile },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to start tailor workflow: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ jobId });
}
