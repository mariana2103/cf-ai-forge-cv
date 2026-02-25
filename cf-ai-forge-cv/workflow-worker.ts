/**
 * ForgeCV Tailor Workflow
 *
 * A standalone Cloudflare Worker that exports the TailorWorkflow class.
 * Deployed separately as "forgecv-workflow" and bound to the main Next.js
 * worker via the `TAILOR_WORKFLOW` workflows binding in wrangler.jsonc.
 *
 * Workflow steps:
 *  1. call-ai   — invoke the 70B model (1 retry, no custom timeout)
 *  2. parse     — extract and validate the JSON response
 *
 * Because this runs as a Workflow, the 70B call is durable: if the Worker
 * instance dies mid-inference (edge timeout, deploy, etc.) Cloudflare
 * automatically retries from the last completed step.
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import {
  TAILOR_SYSTEM_PROMPT,
  TailorParams,
  TailorResult,
  buildTailorUserMessage,
  parseTailorResponse,
} from "./src/lib/tailor-core";

interface Env {
  AI: Ai;
}

// Required so wrangler treats this as an ES Module worker (not legacy Service Worker format)
export default {};

export class TailorWorkflow extends WorkflowEntrypoint<Env, TailorParams> {
  async run(
    event: WorkflowEvent<TailorParams>,
    step: WorkflowStep
  ): Promise<TailorResult> {
    const { resume, jobDescription, masterProfile } = event.payload;

    // Step 1 — Call the 70B model. One retry on hard failure (empty response).
    // No custom timeout — the 70B model can take 2–4 min; letting Cloudflare's
    // default step limit apply avoids the retry-cascade that caused 30-min hangs.
    const aiText = await step.do(
      "call-ai",
      { retries: { limit: 1, delay: "5 seconds", backoff: "linear" } },
      async (): Promise<string> => {
        const userMessage = buildTailorUserMessage(resume, jobDescription, masterProfile);

        const response = await this.env.AI.run(
          "@cf/meta/llama-3.2-3b-instruct",
          {
            messages: [
              { role: "system", content: TAILOR_SYSTEM_PROMPT },
              { role: "user", content: userMessage },
            ],
            max_tokens: 1500,
          }
        );

        const text = (response as { response?: string | null }).response;
        if (typeof text !== "string" || !text) {
          throw new Error("Workers AI returned an empty response — will retry");
        }
        return text;
      }
    );

    // Step 2 — Parse the model output into a validated TailorResult.
    // Runs as a separate step so a parse failure doesn't re-invoke the AI.
    const result = await step.do("parse", async (): Promise<TailorResult> => {
      return parseTailorResponse(aiText, resume);
    });

    return result;
  }
}
