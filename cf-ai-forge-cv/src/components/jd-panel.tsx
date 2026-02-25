"use client"

import { useState } from "react"
import { ChevronDown, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useResumeStore } from "@/lib/resume-store"
import type { TailorResult } from "@/lib/tailor-core"

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 300_000; // 5 min hard cap

export function JdPanel() {
  const {
    jobDescription,
    setJobDescription,
    resume,
    setResume,
    setHighlights,
    status,
    setStatus,
    addChatMessage,
    getMaster,
  } = useResumeStore()
  const [isOpen, setIsOpen] = useState(true)

  const handleTailor = async () => {
    if (!jobDescription.trim() || status === "empty") return
    setStatus("tailoring")
    addChatMessage(
      "assistant",
      "Sending your resume and JD to the AI agent on Cloudflare Workers AI. Analyzing gaps and generating targeted rewrites..."
    )

    try {
      const masterProfile = getMaster()
      const baseResume = masterProfile ?? resume

      // Step 1: Create the Workflow instance — returns immediately with a jobId
      const createRes = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: baseResume, jobDescription, masterProfile }),
      })
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error ?? `Server error ${createRes.status}`)
      }
      const { jobId } = (await createRes.json()) as { jobId: string }

      // Step 2: Poll /api/tailor/status until the Workflow completes
      const result = await pollForResult(jobId)

      setResume(result.tailored)
      setHighlights(result.highlights)
      setStatus("tailored")

      const reasoningSummary = result.reasoning
        .map((r) => `**${r.section}:** ${r.why}`)
        .join("\n")

      addChatMessage(
        "assistant",
        `Done! Made ${result.highlights.length} targeted changes.\n\n**Agent Reasoning:**\n${reasoningSummary}\n\nAmber highlights show every modified field on the canvas.`
      )
    } catch (err) {
      setStatus("loaded")
      addChatMessage(
        "assistant",
        `Tailoring failed: ${(err as Error).message}`
      )
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-t border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Job Description
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          <Textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the target job description here..."
            className="resize-none text-xs bg-secondary/30 border-border h-[130px] overflow-y-auto"
            disabled={status === "tailoring"}
          />
          <Button
            size="sm"
            onClick={handleTailor}
            disabled={
              !jobDescription.trim() ||
              status === "empty" ||
              status === "tailoring"
            }
            className="self-end text-xs gap-1.5"
          >
            {status === "tailoring" ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Tailoring...
              </>
            ) : (
              <>
                <Sparkles className="size-3" />
                Tailor for JD
              </>
            )}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Poll the status endpoint until the Workflow completes, errors, or times out. */
async function pollForResult(jobId: string): Promise<TailorResult> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const res = await fetch(`/api/tailor/status?id=${jobId}`);
    if (!res.ok) throw new Error(`Status check failed: ${res.status}`);

    const data = (await res.json()) as {
      status: string;
      output?: TailorResult;
      error?: { name: string; message: string };
    };

    if (data.status === "complete") {
      if (!data.output) throw new Error("Workflow completed but returned no output");
      return data.output;
    }

    if (data.status === "errored") {
      throw new Error(data.error?.message ?? "Workflow failed — please try again");
    }

    if (data.status === "terminated") {
      throw new Error("Workflow was terminated — please try again");
    }

    // "queued" | "running" | "paused" | "waiting" — keep polling
  }

  throw new Error("Tailoring timed out — please try again");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
