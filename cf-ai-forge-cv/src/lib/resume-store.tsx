"use client"

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import useSWR, { mutate as globalMutate } from "swr"
import type {
  ResumeData,
  ChatMessage,
  HighlightedField,
} from "./resume-types"
import {
  createEmptyResume,
  createSampleResume,
  generateId,
} from "./resume-types"

const RESUME_KEY = "forge-resume"
const CHAT_KEY = "forge-chat"
const JD_KEY = "forge-jd"
const HIGHLIGHTS_KEY = "forge-highlights"
const STATUS_KEY = "forge-status"

type WorkspaceStatus = "empty" | "loaded" | "tailoring" | "tailored"

interface ResumeStoreContextValue {
  resume: ResumeData
  chatMessages: ChatMessage[]
  jobDescription: string
  highlights: HighlightedField[]
  status: WorkspaceStatus
  setResume: (data: ResumeData) => void
  updateField: (path: string, value: string) => void
  addExperienceBullet: (expId: string) => void
  removeExperienceBullet: (expId: string, bulletIndex: number) => void
  addExperience: () => void
  removeExperience: (expId: string) => void
  addSkill: (skill: string) => void
  removeSkill: (index: number) => void
  addEducation: () => void
  removeEducation: (eduId: string) => void
  setJobDescription: (jd: string) => void
  addChatMessage: (role: "user" | "assistant", content: string) => void
  setHighlights: (h: HighlightedField[]) => void
  clearHighlights: () => void
  setStatus: (s: WorkspaceStatus) => void
  loadSample: () => void
  resetAll: () => void
}

const ResumeStoreContext = createContext<ResumeStoreContextValue | null>(null)

export function ResumeStoreProvider({ children }: { children: ReactNode }) {
  const { data: resume } = useSWR<ResumeData>(RESUME_KEY, null, {
    fallbackData: createEmptyResume(),
  })
  const { data: chatMessages } = useSWR<ChatMessage[]>(CHAT_KEY, null, {
    fallbackData: [],
  })
  const { data: jobDescription } = useSWR<string>(JD_KEY, null, {
    fallbackData: "",
  })
  const { data: highlights } = useSWR<HighlightedField[]>(
    HIGHLIGHTS_KEY,
    null,
    { fallbackData: [] }
  )
  const { data: status } = useSWR<WorkspaceStatus>(STATUS_KEY, null, {
    fallbackData: "empty",
  })

  const setResume = useCallback((data: ResumeData) => {
    globalMutate(RESUME_KEY, data, false)
  }, [])

  const updateField = useCallback(
    (path: string, value: string) => {
      if (!resume) return
      const updated = structuredClone(resume)
      const parts = path.split(".")
      let target: Record<string, unknown> = updated as unknown as Record<
        string,
        unknown
      >
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]
        if (Array.isArray(target[key])) {
          const arr = target[key] as Record<string, unknown>[]
          const nextKey = parts[i + 1]
          const idx = arr.findIndex(
            (item) => item.id === nextKey
          )
          if (idx !== -1) {
            target = arr[idx]
            i++
            continue
          }
        }
        target = target[key] as Record<string, unknown>
      }
      const lastKey = parts[parts.length - 1]
      target[lastKey] = value
      globalMutate(RESUME_KEY, updated, false)
    },
    [resume]
  )

  const addExperienceBullet = useCallback(
    (expId: string) => {
      if (!resume) return
      const updated = structuredClone(resume)
      const exp = updated.experience.find((e) => e.id === expId)
      if (exp) {
        exp.bullets.push("")
        globalMutate(RESUME_KEY, updated, false)
      }
    },
    [resume]
  )

  const removeExperienceBullet = useCallback(
    (expId: string, bulletIndex: number) => {
      if (!resume) return
      const updated = structuredClone(resume)
      const exp = updated.experience.find((e) => e.id === expId)
      if (exp) {
        exp.bullets.splice(bulletIndex, 1)
        globalMutate(RESUME_KEY, updated, false)
      }
    },
    [resume]
  )

  const addExperience = useCallback(() => {
    if (!resume) return
    const updated = structuredClone(resume)
    updated.experience.push({
      id: generateId(),
      company: "Company Name",
      role: "Role Title",
      dates: "Start - End",
      bullets: ["Describe your accomplishment..."],
    })
    globalMutate(RESUME_KEY, updated, false)
  }, [resume])

  const removeExperience = useCallback(
    (expId: string) => {
      if (!resume) return
      const updated = structuredClone(resume)
      updated.experience = updated.experience.filter((e) => e.id !== expId)
      globalMutate(RESUME_KEY, updated, false)
    },
    [resume]
  )

  const addSkill = useCallback(
    (skill: string) => {
      if (!resume) return
      const updated = structuredClone(resume)
      updated.skills.push(skill)
      globalMutate(RESUME_KEY, updated, false)
    },
    [resume]
  )

  const removeSkill = useCallback(
    (index: number) => {
      if (!resume) return
      const updated = structuredClone(resume)
      updated.skills.splice(index, 1)
      globalMutate(RESUME_KEY, updated, false)
    },
    [resume]
  )

  const addEducation = useCallback(() => {
    if (!resume) return
    const updated = structuredClone(resume)
    updated.education.push({
      id: generateId(),
      institution: "University Name",
      degree: "Degree",
      dates: "Start - End",
      details: "",
    })
    globalMutate(RESUME_KEY, updated, false)
  }, [resume])

  const removeEducation = useCallback(
    (eduId: string) => {
      if (!resume) return
      const updated = structuredClone(resume)
      updated.education = updated.education.filter((e) => e.id !== eduId)
      globalMutate(RESUME_KEY, updated, false)
    },
    [resume]
  )

  const setJobDescription = useCallback((jd: string) => {
    globalMutate(JD_KEY, jd, false)
  }, [])

  const addChatMessage = useCallback(
    (role: "user" | "assistant", content: string) => {
      const msg: ChatMessage = {
        id: generateId(),
        role,
        content,
        timestamp: Date.now(),
      }
      globalMutate(
        CHAT_KEY,
        (prev: ChatMessage[] | undefined) => [...(prev || []), msg],
        false
      )
    },
    []
  )

  const setHighlights = useCallback((h: HighlightedField[]) => {
    globalMutate(HIGHLIGHTS_KEY, h, false)
  }, [])

  const clearHighlights = useCallback(() => {
    globalMutate(HIGHLIGHTS_KEY, [], false)
  }, [])

  const setStatus = useCallback((s: WorkspaceStatus) => {
    globalMutate(STATUS_KEY, s, false)
  }, [])

  const loadSample = useCallback(() => {
    const sample = createSampleResume()
    globalMutate(RESUME_KEY, sample, false)
    globalMutate(STATUS_KEY, "loaded" as WorkspaceStatus, false)
    globalMutate(
      CHAT_KEY,
      (prev: ChatMessage[] | undefined) => [
        ...(prev || []),
        {
          id: generateId(),
          role: "assistant" as const,
          content:
            "I've loaded a sample resume into the workspace. You can edit any field directly on the canvas, or paste a Job Description and ask me to tailor it.",
          timestamp: Date.now(),
        },
      ],
      false
    )
  }, [])

  const resetAll = useCallback(() => {
    globalMutate(RESUME_KEY, createEmptyResume(), false)
    globalMutate(CHAT_KEY, [], false)
    globalMutate(JD_KEY, "", false)
    globalMutate(HIGHLIGHTS_KEY, [], false)
    globalMutate(STATUS_KEY, "empty" as WorkspaceStatus, false)
  }, [])

  const value = useMemo<ResumeStoreContextValue>(
    () => ({
      resume: resume!,
      chatMessages: chatMessages!,
      jobDescription: jobDescription!,
      highlights: highlights!,
      status: status!,
      setResume,
      updateField,
      addExperienceBullet,
      removeExperienceBullet,
      addExperience,
      removeExperience,
      addSkill,
      removeSkill,
      addEducation,
      removeEducation,
      setJobDescription,
      addChatMessage,
      setHighlights,
      clearHighlights,
      setStatus,
      loadSample,
      resetAll,
    }),
    [
      resume,
      chatMessages,
      jobDescription,
      highlights,
      status,
      setResume,
      updateField,
      addExperienceBullet,
      removeExperienceBullet,
      addExperience,
      removeExperience,
      addSkill,
      removeSkill,
      addEducation,
      removeEducation,
      setJobDescription,
      addChatMessage,
      setHighlights,
      clearHighlights,
      setStatus,
      loadSample,
      resetAll,
    ]
  )

  return (
    <ResumeStoreContext.Provider value={value}>
      {children}
    </ResumeStoreContext.Provider>
  )
}

export function useResumeStore() {
  const ctx = useContext(ResumeStoreContext)
  if (!ctx) throw new Error("useResumeStore must be used within ResumeStoreProvider")
  return ctx
}
