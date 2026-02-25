"use client"

import { useRef } from "react"
import { Eye, EyeOff, Anvil, RotateCcw, Download, Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useResumeStore } from "@/lib/resume-store"
import { RESUME_TEMPLATES, getTemplate } from "@/lib/templates"
import type { ResumeTemplate } from "@/lib/templates"
import type { ResumeData, SectionKey, SkillCategory } from "@/lib/resume-types"
import { cn } from "@/lib/utils"

interface WorkspaceHeaderProps {
  previewMode: boolean
  onTogglePreview: () => void
}

export function WorkspaceHeader({
  previewMode,
  onTogglePreview,
}: WorkspaceHeaderProps) {
  const { status, resetAll, resume, templateId, setTemplateId, accentColor, setAccentColor } =
    useResumeStore()
  const { theme, setTheme } = useTheme()

  const colorInputRef = useRef<HTMLInputElement>(null)
  const template = getTemplate(templateId)

  const handleExportPdf = () => {
    const html = buildPrintHtml(resume, template, accentColor)
    // Use a hidden iframe so the print dialog is isolated to the resume HTML only —
    // no browser address bar, no tab title header, no main-page content.
    const iframe = document.createElement("iframe")
    iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;pointer-events:none"
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open()
    doc.write(html)
    doc.close()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1_000)
    }, 400)
  }

  return (
    <header className="flex h-12 items-center justify-between border-b border-border px-4 gap-4">
      {/* Left: logo + status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Anvil className="size-5 text-primary" />
          <span className="text-sm font-semibold text-foreground tracking-tight">
            ForgeCV
          </span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <span className="text-xs text-muted-foreground font-mono">
          workspace
        </span>
        {status !== "empty" && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 border-border text-muted-foreground"
          >
            {status === "loaded" && "resume loaded"}
            {status === "tailoring" && "tailoring..."}
            {status === "tailored" && "tailored"}
          </Badge>
        )}
      </div>

      {/* Centre: template picker + optional accent color swatch */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {RESUME_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplateId(t.id)}
            title={t.description}
            className={cn(
              "rounded px-2.5 py-1 text-[10px] font-medium transition-colors whitespace-nowrap",
              templateId === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {t.name}
          </button>
        ))}

        {/* Color swatch — only visible when Rezi+ is active */}
        {template.supportsAccent && (
          <>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <button
              onClick={() => colorInputRef.current?.click()}
              title="Pick accent color"
              className="size-5 rounded-full border-2 border-white/20 shadow transition-transform hover:scale-110 shrink-0"
              style={{ backgroundColor: accentColor }}
              aria-label="Accent color"
            />
            <input
              ref={colorInputRef}
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="sr-only"
              tabIndex={-1}
            />
          </>
        )}
      </div>

      {/* Right: preview toggle + reset + export */}
      <div className="flex items-center gap-1.5 shrink-0">
        {status !== "empty" && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onTogglePreview}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              previewMode && "text-primary bg-primary/10"
            )}
            aria-label={previewMode ? "Exit preview" : "Preview resume"}
          >
            {previewMode ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={resetAll}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Reset workspace"
        >
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportPdf}
          disabled={status === "empty"}
          className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
        >
          <Download className="size-3.5" />
          Export PDF
        </Button>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   PDF HTML builder — handles all 8 section types + sectionOrder + SkillCategory[]
───────────────────────────────────────────────────────────────────────────── */

function buildPrintHtml(
  resume: ResumeData,
  template: ResumeTemplate,
  accentColor: string
): string {
  const { contact } = resume
  const accent = accentColor || template.defaultAccent || "#111111"
  const isHarvard = template.id === "harvard"
  const isRezi = template.id === "rezi" || template.id === "rezi-colored"
  const isReziColored = template.id === "rezi-colored"

  // Inject accent color into template CSS
  const css = template.printCss.replace(/\{\{ACCENT\}\}/g, accent)

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  const contactLine = [
    contact.email, contact.phone, contact.location, contact.linkedin, contact.github,
  ].filter(Boolean).map(esc).join(" | ")

  // Header — Harvard = centered, Rezi = left-aligned
  const headerHtml = isHarvard
    ? `<div class="header">
        <h1>${esc(contact.name)}</h1>
        ${contact.title ? `<div style="font-size:10pt;color:#333;margin-top:2pt">${esc(contact.title)}</div>` : ""}
        <div class="contact-line">${contactLine}</div>
      </div>`
    : `<h1>${esc(contact.name)}</h1>
       ${contact.title ? `<div style="font-size:10pt;color:#555;margin-bottom:2pt">${esc(contact.title)}</div>` : ""}
       <div class="contact-line">${contactLine}</div>`

  const renderSection = (key: SectionKey): string => {
    switch (key) {
      case "summary": {
        if (!resume.summary?.trim()) return ""
        return `<h2>Summary</h2>
<div style="font-size:10pt;line-height:1.5;margin-bottom:6pt">${esc(resume.summary)}</div>`
      }

      case "experience": {
        const expEntries = resume.experience.filter((e) => e.role?.trim() || e.company?.trim())
        if (!expEntries.length) return ""
        const items = expEntries.map((e) => {
          const bullets = e.bullets.filter(Boolean)
            .map((b) => `<li>${esc(b)}</li>`).join("")
          if (isRezi) {
            // Role | Company | Location | Dates on one line; middle-dot bullets
            const metaParts = [e.company, e.location, e.dates].filter((x): x is string => Boolean(x)).map(esc)
            return `<div style="margin-bottom:8pt">
  <div class="job-meta">
    <span class="${isReziColored ? "job-role" : ""}" style="${isReziColored ? `color:${accent};font-weight:600` : "font-weight:600"}">${esc(e.role)}</span>
    ${metaParts.map((p) => ` | <span class="dates-meta">${p}</span>`).join("")}
  </div>
  <ul>${bullets}</ul>
</div>`
          }
          // Harvard — "Role — Company, Location" with right-aligned dates
          const titleParts = [e.role, e.company].filter(Boolean).map(esc).join(" — ")
          const loc = e.location ? `, ${esc(e.location)}` : ""
          return `<div style="margin-bottom:10pt">
  <div class="job-header">
    <h3>${titleParts}${loc}</h3>
    <span class="dates">${esc(e.dates)}</span>
  </div>
  <ul>${bullets}</ul>
</div>`
        }).join("")
        return `<h2>Experience</h2>${items}`
      }

      case "skills": {
        if (!resume.skills.length) return ""
        const lines = (resume.skills as SkillCategory[]).map((cat) =>
          `<div class="skills-line"><span class="skills-label">${esc(cat.label)}:</span> ${cat.skills.map(esc).join(", ")}</div>`
        ).join("")
        return `<h2>Skills</h2>${lines}`
      }

      case "education": {
        const eduEntries = resume.education.filter((e) => e.institution?.trim() || e.degree?.trim())
        if (!eduEntries.length) return ""
        const items = eduEntries.map((e) => {
          if (isRezi) {
            return `<div style="margin-bottom:6pt">
  <div><strong>${esc(e.degree)}</strong> | ${esc(e.institution)} | <span class="dates-meta">${esc(e.dates)}</span></div>
  ${e.details ? `<div style="font-size:9.5pt;color:#444;margin-top:1pt">${esc(e.details)}</div>` : ""}
</div>`
          }
          return `<div style="margin-bottom:6pt">
  <div class="job-header">
    <h3>${esc(e.degree)} — ${esc(e.institution)}</h3>
    <span class="dates">${esc(e.dates)}</span>
  </div>
  ${e.details ? `<div style="font-size:9.5pt;color:#444">${esc(e.details)}</div>` : ""}
</div>`
        }).join("")
        return `<h2>Education</h2>${items}`
      }

      case "projects": {
        const projEntries = resume.projects.filter((p) => p.name?.trim() && p.name !== "Project Name")
        if (!projEntries.length) return ""
        const items = projEntries.map((p) => {
          const bullets = p.bullets.filter(Boolean)
            .map((b) => `<li>${esc(b)}</li>`).join("")
          return `<div style="margin-bottom:8pt">
  <div class="job-header">
    <h3>${esc(p.name)}${p.description ? ` — ${esc(p.description)}` : ""}</h3>
    ${p.dates ? `<span class="dates">${esc(p.dates)}</span>` : ""}
  </div>
  ${bullets ? `<ul>${bullets}</ul>` : ""}
</div>`
        }).join("")
        return `<h2>Projects</h2>${items}`
      }

      case "certifications": {
        const certEntries = resume.certifications.filter((c) => c.name?.trim() && c.name !== "Certification")
        if (!certEntries.length) return ""
        const items = certEntries.map((c) =>
          `<div style="margin-bottom:5pt">
  <div class="job-header">
    <h3>${esc(c.name)}${c.issuer ? ` — ${esc(c.issuer)}` : ""}</h3>
    ${c.date ? `<span class="dates">${esc(c.date)}</span>` : ""}
  </div>
  ${c.details ? `<div style="font-size:9.5pt;color:#444">${esc(c.details)}</div>` : ""}
</div>`
        ).join("")
        return `<h2>Certifications</h2>${items}`
      }

      case "awards": {
        const awardEntries = resume.awards.filter((a) => a.name?.trim() && a.name !== "Award Name")
        if (!awardEntries.length) return ""
        const items = awardEntries.map((a) =>
          `<div style="margin-bottom:5pt">
  <div class="job-header">
    <h3>${esc(a.name)}</h3>
    ${a.date ? `<span class="dates">${esc(a.date)}</span>` : ""}
  </div>
  ${a.description ? `<div style="font-size:9.5pt;color:#444">${esc(a.description)}</div>` : ""}
</div>`
        ).join("")
        return `<h2>Awards</h2>${items}`
      }

      case "publications": {
        const pubEntries = resume.publications.filter((p) => p.title?.trim() && p.title !== "Publication Title")
        if (!pubEntries.length) return ""
        const items = pubEntries.map((p) =>
          `<div style="margin-bottom:5pt">
  <div class="job-header">
    <strong>${esc(p.title)}</strong>
    ${p.date ? `<span class="dates">${esc(p.date)}</span>` : ""}
  </div>
  ${p.venue ? `<div style="font-size:9.5pt;color:#555;font-style:italic">${esc(p.venue)}</div>` : ""}
  ${p.description ? `<div style="font-size:9.5pt;color:#444">${esc(p.description)}</div>` : ""}
</div>`
        ).join("")
        return `<h2>Publications</h2>${items}`
      }

      default:
        return ""
    }
  }

  const sectionsHtml = resume.sectionOrder.map(renderSection).join("\n")

  return `<!DOCTYPE html>
<html><head><title>${esc(contact.name)} - Resume</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{margin:0;size:A4}
  body{max-width:210mm;margin:0 auto;padding:14mm 16mm}
  .job-header{display:flex;justify-content:space-between;align-items:baseline;gap:8pt}
  @media print{body{padding:14mm 16mm;max-width:100%}}
  ${css}
</style></head>
<body>
${headerHtml}
${sectionsHtml}
</body></html>`
}
