import type { ResumeData, HighlightedField } from "./resume-types"

/**
 * Simulates AI tailoring by modifying the resume based on keywords
 * found in the job description. In production this would hit a real LLM.
 */
export function simulateTailoring(
  resume: ResumeData,
  _jobDescription: string
): { tailored: ResumeData; highlights: HighlightedField[] } {
  const tailored = structuredClone(resume)
  const highlights: HighlightedField[] = []

  // Enhance summary
  if (tailored.summary) {
    tailored.summary =
      "Results-driven software engineer with 6+ years shipping scalable distributed systems and cloud-native platforms. Expert in designing event-driven architectures processing millions of daily transactions. Passionate about developer experience, observability, and infrastructure-as-code."
    highlights.push({ path: "summary", type: "changed" })
  }

  // Enhance first experience bullets
  if (tailored.experience.length > 0) {
    const first = tailored.experience[0]
    if (first.bullets.length > 0) {
      first.bullets[0] =
        "Designed and shipped event-driven microservices handling 12M+ events/day using Kafka Streams and Redis, cutting p99 latency from 320ms to 180ms"
      highlights.push({
        path: `experience.${first.id}.bullets.0`,
        type: "changed",
      })
    }
    if (first.bullets.length > 1) {
      first.bullets[1] =
        "Led zero-downtime migration from monolith to Kubernetes, enabling 50+ daily deploys with automated canary analysis"
      highlights.push({
        path: `experience.${first.id}.bullets.1`,
        type: "changed",
      })
    }
  }

  // Enhance second experience
  if (tailored.experience.length > 1) {
    const second = tailored.experience[1]
    if (second.bullets.length > 0) {
      second.bullets[0] =
        "Built real-time streaming pipeline processing 2TB+/day on Apache Flink and Kinesis, powering analytics for 500K+ active users"
      highlights.push({
        path: `experience.${second.id}.bullets.0`,
        type: "changed",
      })
    }
  }

  // Reorder skills to front-load relevant ones
  const prioritySkills = [
    "TypeScript",
    "Go",
    "Kubernetes",
    "Terraform",
    "AWS",
    "Kafka",
    "PostgreSQL",
    "Redis",
    "Docker",
    "CI/CD",
    "Python",
    "Rust",
    "Apache Flink",
    "System Design",
  ]
  tailored.skills = prioritySkills.filter(
    (s) =>
      resume.skills.some(
        (rs) => rs.toLowerCase() === s.toLowerCase()
      )
  )
  // Add any missing original skills
  resume.skills.forEach((s) => {
    if (
      !tailored.skills.some(
        (ts) => ts.toLowerCase() === s.toLowerCase()
      )
    ) {
      tailored.skills.push(s)
    }
  })
  highlights.push({ path: "skills", type: "changed" })

  return { tailored, highlights }
}

/**
 * Simple mock chat responses based on user messages.
 */
export function generateChatResponse(
  message: string,
  _resume: ResumeData,
  _jd: string
): string {
  const lower = message.toLowerCase()

  if (lower.includes("tailor") || lower.includes("jd") || lower.includes("job")) {
    return "I'll analyze the job description and tailor your resume. I'll rewrite your summary to match key requirements, reorder your skills by relevance, and strengthen bullet points with quantified impact metrics. Changes will be highlighted in amber on the canvas."
  }

  if (lower.includes("summary") || lower.includes("objective")) {
    return "Your summary is solid but could be tighter. I'd recommend leading with your strongest differentiator (distributed systems at scale), then following with your years of experience and a specific metric. Want me to rewrite it?"
  }

  if (lower.includes("bullet") || lower.includes("experience")) {
    return "Good bullet points follow the 'Action verb + What + Metric' pattern. I see a few bullets that could use stronger quantification. For example, 'Mentored team of 4 junior engineers' could become 'Mentored 4 engineers, 2 of whom were promoted within 12 months.' Want me to enhance all bullets?"
  }

  if (lower.includes("skill") || lower.includes("keyword")) {
    return "Based on the JD, I'd recommend reordering your skills to lead with TypeScript and Go since they're mentioned first. I'd also add 'Infrastructure-as-Code' and 'Observability' as those are emphasized in the requirements."
  }

  if (lower.includes("format") || lower.includes("ats")) {
    return "Your resume looks ATS-friendly overall. The clear section headers and standard formatting should parse well. I'd suggest avoiding tables or columns if you're submitting through an ATS. The current single-column layout is ideal."
  }

  return "I can help you tailor your resume, improve bullet points, optimize for ATS systems, or restructure sections. Try asking me to 'tailor this for the JD' or 'improve my experience bullets.'"
}
