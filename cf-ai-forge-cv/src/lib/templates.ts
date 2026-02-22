export interface ResumeTemplate {
  id: string
  name: string
  /** Font stack applied to the resume container in the live canvas */
  fontFamily: string
  /** Tailwind classes for the candidate name */
  nameClass: string
  /** Tailwind classes for section headings (Experience, Skills, etc.) */
  headingClass: string
  /** CSS injected into the <style> block of the print/export HTML */
  printCss: string
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: "modern",
    name: "Modern",
    fontFamily: "system-ui, -apple-system, sans-serif",
    nameClass: "text-2xl font-bold tracking-tight text-foreground",
    headingClass:
      "text-[10px] font-semibold uppercase tracking-widest text-primary border-b border-primary/20 pb-1",
    printCss: `
      body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #111; }
      h1  { font-size: 20pt; font-weight: 700; margin-bottom: 2pt; }
      h2  { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;
            color: #e8610a; border-bottom: 1.5px solid #e8610a; padding-bottom: 3pt; margin: 14pt 0 6pt; }
    `,
  },
  {
    id: "classic",
    name: "Classic",
    fontFamily: "Georgia, 'Times New Roman', serif",
    nameClass: "text-[26px] font-bold tracking-tight text-foreground",
    headingClass:
      "text-[10px] font-bold uppercase tracking-widest border-b-2 border-foreground/30 pb-1",
    printCss: `
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.45; color: #111; }
      h1  { font-size: 20pt; font-weight: 700; margin-bottom: 2pt; }
      h2  { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
            border-bottom: 2px solid #333; padding-bottom: 3pt; margin: 14pt 0 6pt; }
    `,
  },
  {
    id: "compact",
    name: "Compact",
    fontFamily: "Arial, Helvetica, sans-serif",
    nameClass: "text-xl font-bold tracking-tight text-foreground",
    headingClass:
      "text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-0.5",
    printCss: `
      body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; line-height: 1.3; color: #111; }
      h1  { font-size: 16pt; font-weight: 700; margin-bottom: 2pt; }
      h2  { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
            border-bottom: 1px solid #999; padding-bottom: 2pt; margin: 10pt 0 4pt; color: #444; }
    `,
  },
  {
    id: "technical",
    name: "Technical",
    fontFamily: "'Geist Mono', 'Courier New', Consolas, monospace",
    nameClass: "text-2xl font-bold tracking-tight font-mono text-foreground",
    headingClass:
      "text-[10px] font-bold text-primary font-mono before:content-['//'] before:mr-1.5 before:opacity-60",
    printCss: `
      body { font-family: 'Courier New', Consolas, monospace; font-size: 10pt; line-height: 1.4; color: #111; }
      h1  { font-size: 18pt; font-weight: 700; margin-bottom: 2pt; }
      h2  { font-size: 9.5pt; font-weight: 700; color: #e8610a; margin: 14pt 0 6pt; }
      h2::before { content: '// '; opacity: 0.7; }
    `,
  },
  {
    id: "executive",
    name: "Executive",
    fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
    nameClass:
      "text-[28px] font-bold tracking-wide text-foreground text-center w-full",
    headingClass:
      "text-[9px] font-bold uppercase tracking-[3px] text-center border-y border-foreground/20 py-1 w-full",
    printCss: `
      body { font-family: 'Palatino Linotype', Palatino, Georgia, serif; font-size: 11pt; line-height: 1.5; color: #111; }
      h1  { font-size: 22pt; font-weight: 700; text-align: center; margin-bottom: 4pt; }
      .contact { text-align: center; }
      h2  { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;
            text-align: center; border-top: 1px solid #999; border-bottom: 1px solid #999;
            padding: 3pt 0; margin: 14pt 0 6pt; }
    `,
  },
]

export const DEFAULT_TEMPLATE_ID = "modern"

export function getTemplate(id: string): ResumeTemplate {
  return RESUME_TEMPLATES.find((t) => t.id === id) ?? RESUME_TEMPLATES[0]
}
