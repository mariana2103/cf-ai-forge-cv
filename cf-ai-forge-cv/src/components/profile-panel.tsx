"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronDown, Check, User, Trash2, ArrowDownToLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useResumeStore } from "@/lib/resume-store"
import { getMasterProfile, clearMasterProfile, saveMasterProfile } from "@/lib/master-profile"
import type { ResumeData } from "@/lib/resume-types"
import { migrateResumeData } from "@/lib/resume-types"

export const BIO_KEY = "forgecv-bio"

export function ProfilePanel() {
  const { setResume, setStatus } = useResumeStore()

  const [isOpen, setIsOpen] = useState(false)
  const [bio, setBio] = useState("")
  const [bioSaved, setBioSaved] = useState(false)

  // Master profile state
  const [master, setMaster] = useState<ResumeData | null>(null)
  const [editingJson, setEditingJson] = useState(false)
  const [jsonDraft, setJsonDraft] = useState("")
  const [jsonError, setJsonError] = useState("")
  const [jsonSaved, setJsonSaved] = useState(false)

  const refreshMaster = useCallback(() => {
    setMaster(getMasterProfile())
  }, [])

  useEffect(() => {
    setBio(localStorage.getItem(BIO_KEY) ?? "")
    refreshMaster()
  }, [refreshMaster])

  // Sync draft when opening JSON editor
  useEffect(() => {
    if (editingJson && master) {
      setJsonDraft(JSON.stringify(master, null, 2))
      setJsonError("")
    }
  }, [editingJson, master])

  const handleSaveBio = () => {
    localStorage.setItem(BIO_KEY, bio)
    setBioSaved(true)
    setTimeout(() => setBioSaved(false), 2000)
  }

  const handleLoadIntoCanvas = () => {
    if (!master) return
    setResume(master)
    setStatus("loaded")
  }

  const handleClearMaster = () => {
    clearMasterProfile()
    setMaster(null)
    setEditingJson(false)
  }

  const handleSaveJson = () => {
    try {
      const parsed = migrateResumeData(JSON.parse(jsonDraft))
      saveMasterProfile(parsed)
      setMaster(parsed)
      setJsonError("")
      setJsonSaved(true)
      setEditingJson(false)
      setTimeout(() => setJsonSaved(false), 2000)
    } catch {
      setJsonError("Invalid JSON — fix the syntax and try again.")
    }
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => { setIsOpen(open); if (open) refreshMaster() }}
      className="border-b border-border"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors">
        <div className="flex items-center gap-2">
          <User className="size-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            My Profile
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1 flex flex-col gap-4">

          {/* ── Bio / context for AI ──────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-muted-foreground">
              AI context — dump anything here: career history, side projects, what you're looking for. The more detail, the better the tailoring.
            </p>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={`E.g.\n5 years backend engineering, mostly Go and TypeScript.\nBuilt a distributed payments system at Acme Corp processing $2B/year.\nSide project: open-source CLI tool with 3k GitHub stars.\n...`}
              className="resize-none text-xs bg-secondary/30 border-border h-[120px] overflow-y-auto font-mono"
            />
            <Button
              size="sm"
              onClick={handleSaveBio}
              className={cn(
                "self-end text-xs gap-1.5",
                bioSaved && "bg-green-600 hover:bg-green-600"
              )}
            >
              {bioSaved ? <><Check className="size-3" />Saved</> : "Save"}
            </Button>
          </div>

          {/* ── Master profile ────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Saved Profile
              </p>
              {master && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingJson((v) => !v)}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary/50"
                  >
                    {editingJson ? "Cancel" : "Edit JSON"}
                  </button>
                </div>
              )}
            </div>

            {!master ? (
              <p className="text-[10px] text-muted-foreground/60 italic">
                No profile saved yet. Upload a resume to build one automatically.
              </p>
            ) : editingJson ? (
              /* JSON editor */
              <div className="flex flex-col gap-2">
                <Textarea
                  value={jsonDraft}
                  onChange={(e) => { setJsonDraft(e.target.value); setJsonError("") }}
                  className="resize-none text-[10px] font-mono bg-secondary/30 border-border h-[220px] overflow-y-auto"
                />
                {jsonError && (
                  <p className="text-[10px] text-destructive">{jsonError}</p>
                )}
                <div className="flex items-center gap-1.5 self-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingJson(false); setJsonError("") }}
                    className="text-xs text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveJson}
                    className={cn("text-xs gap-1.5", jsonSaved && "bg-green-600 hover:bg-green-600")}
                  >
                    {jsonSaved ? <><Check className="size-3" />Saved</> : "Save Profile"}
                  </Button>
                </div>
              </div>
            ) : (
              /* Summary view */
              <div className="flex flex-col gap-2">
                <div className="rounded-md bg-secondary/30 border border-border px-3 py-2 flex flex-col gap-1">
                  <p className="text-[11px] font-medium text-foreground">
                    {master.contact.name || "Unnamed"}
                  </p>
                  {master.contact.title && (
                    <p className="text-[10px] text-muted-foreground">{master.contact.title}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-[10px] text-muted-foreground/70">
                      {master.experience.length} experience {master.experience.length === 1 ? "entry" : "entries"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {master.skills.reduce((n, c) => n + c.skills.length, 0)} skills
                    </span>
                    {master.education.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/70">
                        {master.education.length} education {master.education.length === 1 ? "entry" : "entries"}
                      </span>
                    )}
                  </div>
                  {master.experience.length > 0 && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {master.experience.slice(0, 3).map((e) => (
                        <p key={e.id} className="text-[10px] text-muted-foreground truncate">
                          · {e.role}{e.company ? ` @ ${e.company}` : ""}
                        </p>
                      ))}
                      {master.experience.length > 3 && (
                        <p className="text-[10px] text-muted-foreground/50">
                          +{master.experience.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLoadIntoCanvas}
                    className="flex-1 text-xs gap-1.5 border-border"
                  >
                    <ArrowDownToLine className="size-3" />
                    Load into Canvas
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearMaster}
                    className="text-xs text-muted-foreground hover:text-destructive gap-1.5 px-2"
                    title="Clear saved profile"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
