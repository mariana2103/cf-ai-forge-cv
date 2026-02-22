import type { ResumeData, ExperienceEntry, EducationEntry } from "./resume-types"

const MASTER_KEY = "forgecv-master-profile"

/** Read the full career profile from localStorage. Returns null on first use. */
export function getMasterProfile(): ResumeData | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(MASTER_KEY)
    return raw ? (JSON.parse(raw) as ResumeData) : null
  } catch {
    return null
  }
}

/** Persist the master profile to localStorage. */
export function saveMasterProfile(data: ResumeData): void {
  if (typeof window === "undefined") return
  localStorage.setItem(MASTER_KEY, JSON.stringify(data))
}

export function clearMasterProfile(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(MASTER_KEY)
}

/**
 * Merge a newly-uploaded resume into the existing master profile.
 * - Contact: incoming non-empty fields override master
 * - Experience: deduplicated by company + role
 * - Skills: union, deduplicated case-insensitively
 * - Education: deduplicated by institution name
 */
export function mergeIntoMaster(
  master: ResumeData | null,
  incoming: ResumeData
): ResumeData {
  if (!master) return incoming

  const contact = { ...master.contact }
  for (const k of Object.keys(incoming.contact) as (keyof typeof incoming.contact)[]) {
    if (incoming.contact[k]) contact[k] = incoming.contact[k]
  }

  const skillsLower = new Set(master.skills.map((s) => s.toLowerCase()))
  const mergedSkills = [...master.skills]
  for (const s of incoming.skills) {
    if (!skillsLower.has(s.toLowerCase())) {
      mergedSkills.push(s)
      skillsLower.add(s.toLowerCase())
    }
  }

  return {
    contact,
    summary: incoming.summary || master.summary,
    experience: mergeExperience(master.experience, incoming.experience),
    skills: mergedSkills,
    education: mergeEducation(master.education, incoming.education),
  }
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim()
}

function mergeExperience(
  master: ExperienceEntry[],
  incoming: ExperienceEntry[]
): ExperienceEntry[] {
  const result = [...master]
  for (const entry of incoming) {
    const exists = result.some(
      (e) =>
        normalize(e.company) === normalize(entry.company) &&
        normalize(e.role) === normalize(entry.role)
    )
    if (!exists) result.push(entry)
  }
  return result
}

function mergeEducation(
  master: EducationEntry[],
  incoming: EducationEntry[]
): EducationEntry[] {
  const result = [...master]
  for (const entry of incoming) {
    const exists = result.some(
      (e) => normalize(e.institution) === normalize(entry.institution)
    )
    if (!exists) result.push(entry)
  }
  return result
}
