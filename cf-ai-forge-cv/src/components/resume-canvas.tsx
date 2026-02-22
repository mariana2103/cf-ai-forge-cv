"use client"

import { useCallback } from "react"
import { Plus, X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { InlineEdit } from "./inline-edit"
import { useResumeStore } from "@/lib/resume-store"
import { cn } from "@/lib/utils"

function isHighlighted(
  highlights: { path: string; type: string }[],
  path: string
): boolean {
  return highlights.some((h) => h.path === path || path.startsWith(h.path))
}

export function ResumeCanvas() {
  const {
    resume,
    highlights,
    status,
    updateField,
    setResume,
    addExperienceBullet,
    removeExperienceBullet,
    addExperience,
    removeExperience,
    addSkill,
    removeSkill,
    addEducation,
    removeEducation,
  } = useResumeStore()

  const updateBullet = useCallback(
    (expId: string, bulletIndex: number, value: string) => {
      const updated = structuredClone(resume)
      const target = updated.experience.find((e) => e.id === expId)
      if (target) {
        target.bullets[bulletIndex] = value
        setResume(updated)
      }
    },
    [resume, setResume]
  )

  const empty = status === "empty"

  if (empty) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background px-8 text-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            Live Canvas
          </h2>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Your resume will appear here as an interactive, editable document.
            Upload a file or paste text in the Command Center to get started.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-muted-foreground/20" />
          <div className="size-2 rounded-full bg-muted-foreground/20" />
          <div className="size-2 rounded-full bg-muted-foreground/20" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border">
        <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Live Canvas
        </h2>
        {highlights.length > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 border-amber-400/30 text-amber-400"
          >
            {highlights.length} changes
          </Badge>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl px-8 py-6">
          {/* Contact Header */}
          <section className="mb-5">
            <InlineEdit
              value={resume.contact.name}
              onChange={(v) => updateField("contact.name", v)}
              className="text-2xl font-bold text-foreground tracking-tight"
              placeholder="Your Name"
            />
            <InlineEdit
              value={resume.contact.title}
              onChange={(v) => updateField("contact.title", v)}
              className="text-sm text-muted-foreground mt-0.5"
              placeholder="Professional Title"
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <InlineEdit
                value={resume.contact.email}
                onChange={(v) => updateField("contact.email", v)}
                className="text-xs text-muted-foreground w-auto"
                placeholder="email@example.com"
              />
              <span className="text-muted-foreground/30 text-xs">|</span>
              <InlineEdit
                value={resume.contact.phone}
                onChange={(v) => updateField("contact.phone", v)}
                className="text-xs text-muted-foreground w-auto"
                placeholder="Phone"
              />
              <span className="text-muted-foreground/30 text-xs">|</span>
              <InlineEdit
                value={resume.contact.location}
                onChange={(v) => updateField("contact.location", v)}
                className="text-xs text-muted-foreground w-auto"
                placeholder="Location"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <InlineEdit
                value={resume.contact.linkedin}
                onChange={(v) => updateField("contact.linkedin", v)}
                className="text-xs text-primary/70 w-auto"
                placeholder="LinkedIn URL"
              />
              <span className="text-muted-foreground/30 text-xs">|</span>
              <InlineEdit
                value={resume.contact.github}
                onChange={(v) => updateField("contact.github", v)}
                className="text-xs text-primary/70 w-auto"
                placeholder="GitHub URL"
              />
            </div>
          </section>

          <Separator className="mb-4" />

          {/* Summary */}
          <section className="mb-5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-2">
              Summary
            </h3>
            <InlineEdit
              value={resume.summary}
              onChange={(v) => updateField("summary", v)}
              className="text-xs text-muted-foreground leading-relaxed"
              placeholder="Write a professional summary..."
              highlighted={isHighlighted(highlights, "summary")}
              multiline
            />
          </section>

          <Separator className="mb-4" />

          {/* Experience */}
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest">
                Experience
              </h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={addExperience}
                className="size-6 text-muted-foreground hover:text-primary"
                aria-label="Add experience"
              >
                <Plus className="size-3" />
              </Button>
            </div>
            <div className="flex flex-col gap-5">
              {resume.experience.map((exp) => (
                <div key={exp.id} className="group relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <InlineEdit
                          value={exp.role}
                          onChange={(v) =>
                            updateField(
                              `experience.${exp.id}.role`,
                              v
                            )
                          }
                          className="text-sm font-semibold text-foreground"
                          placeholder="Role Title"
                        />
                        <span className="text-xs text-muted-foreground/40">
                          at
                        </span>
                        <InlineEdit
                          value={exp.company}
                          onChange={(v) =>
                            updateField(
                              `experience.${exp.id}.company`,
                              v
                            )
                          }
                          className="text-sm text-foreground"
                          placeholder="Company"
                        />
                      </div>
                      <InlineEdit
                        value={exp.dates}
                        onChange={(v) =>
                          updateField(`experience.${exp.id}.dates`, v)
                        }
                        className="text-[11px] text-muted-foreground mt-0.5"
                        placeholder="Start - End"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeExperience(exp.id)}
                      className="size-5 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
                      aria-label="Remove experience"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>

                  <ul className="mt-2 flex flex-col gap-1.5">
                    {exp.bullets.map((bullet, bi) => (
                      <li key={bi} className="flex items-start gap-1 group/bullet">
                        <GripVertical className="size-3 text-muted-foreground/20 mt-0.5 shrink-0 opacity-0 group-hover/bullet:opacity-100 transition-opacity" />
                        <span className="text-muted-foreground/60 text-xs mt-px shrink-0">
                          {"\u2022"}
                        </span>
                        <InlineEdit
                          value={bullet}
                          onChange={(v) => updateBullet(exp.id, bi, v)}
                          className={cn(
                            "text-xs text-muted-foreground leading-relaxed flex-1",
                          )}
                          placeholder="Describe your accomplishment..."
                          highlighted={isHighlighted(
                            highlights,
                            `experience.${exp.id}.bullets.${bi}`
                          )}
                          multiline
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            removeExperienceBullet(exp.id, bi)
                          }
                          className="size-4 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover/bullet:opacity-100 transition-opacity shrink-0 mt-0.5"
                          aria-label="Remove bullet"
                        >
                          <X className="size-2.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => addExperienceBullet(exp.id)}
                    className="mt-1.5 ml-6 text-[10px] text-muted-foreground/40 hover:text-primary transition-colors"
                  >
                    + add bullet
                  </button>
                </div>
              ))}
            </div>
          </section>

          <Separator className="mb-4" />

          {/* Skills */}
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest">
                Skills
              </h3>
            </div>
            <div
              className={cn(
                "flex flex-wrap gap-1.5",
                isHighlighted(highlights, "skills") &&
                  "ring-1 ring-amber-400/30 rounded-md p-1.5 bg-amber-400/5"
              )}
            >
              {resume.skills.map((skill, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="group/skill text-[11px] gap-1 pr-1 font-normal"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(i)}
                    className="opacity-0 group-hover/skill:opacity-100 transition-opacity"
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}
              <button
                onClick={() => {
                  const skill = prompt("Add skill:")
                  if (skill?.trim()) addSkill(skill.trim())
                }}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                <Plus className="size-2.5" />
                add
              </button>
            </div>
          </section>

          <Separator className="mb-4" />

          {/* Education */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest">
                Education
              </h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={addEducation}
                className="size-6 text-muted-foreground hover:text-primary"
                aria-label="Add education"
              >
                <Plus className="size-3" />
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              {resume.education.map((edu) => (
                <div key={edu.id} className="group relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <InlineEdit
                          value={edu.degree}
                          onChange={(v) =>
                            updateField(
                              `education.${edu.id}.degree`,
                              v
                            )
                          }
                          className="text-sm font-semibold text-foreground"
                          placeholder="Degree"
                        />
                        <span className="text-xs text-muted-foreground/40">
                          at
                        </span>
                        <InlineEdit
                          value={edu.institution}
                          onChange={(v) =>
                            updateField(
                              `education.${edu.id}.institution`,
                              v
                            )
                          }
                          className="text-sm text-foreground"
                          placeholder="Institution"
                        />
                      </div>
                      <InlineEdit
                        value={edu.dates}
                        onChange={(v) =>
                          updateField(
                            `education.${edu.id}.dates`,
                            v
                          )
                        }
                        className="text-[11px] text-muted-foreground mt-0.5"
                        placeholder="Start - End"
                      />
                      <InlineEdit
                        value={edu.details}
                        onChange={(v) =>
                          updateField(
                            `education.${edu.id}.details`,
                            v
                          )
                        }
                        className="text-xs text-muted-foreground/70 mt-1"
                        placeholder="Additional details..."
                        multiline
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeEducation(edu.id)}
                      className="size-5 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
                      aria-label="Remove education"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}


