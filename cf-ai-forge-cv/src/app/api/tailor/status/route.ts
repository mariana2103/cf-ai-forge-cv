import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { TailorParams } from "@/lib/tailor-core";

type EnvWithWorkflow = CloudflareEnv & {
  TAILOR_WORKFLOW: Workflow<TailorParams>;
};

export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext() as unknown as { env: EnvWithWorkflow };

  const jobId = request.nextUrl.searchParams.get("id");
  if (!jobId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const instance = await env.TAILOR_WORKFLOW.get(jobId);
  const status = await instance.status();

  return NextResponse.json(status);
}
