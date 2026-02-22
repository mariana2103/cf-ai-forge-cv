"use client"

import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, Type, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useResumeStore } from "@/lib/resume-store"
import type { ResumeData } from "@/lib/resume-types"

/** Extract plain text from a PDF file using pdfjs running in the browser. */
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist")
  // Serve the worker locally from /public — avoids CDN latency on first load
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
    pages.push(pageText)
  }

  return pages.join("\n\n")
}

/** Parse extracted text into a structured ResumeData via Workers AI. */
async function parseResumeText(text: string): Promise<ResumeData> {
  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(await res.text())
  const { resume } = (await res.json()) as { resume: ResumeData }
  return resume
}

export function CommandDropzone() {
  const { status, setResume, setStatus, addChatMessage, loadSample } =
    useResumeStore()
  const [mode, setMode] = useState<"drop" | "text">("drop")
  const [textInput, setTextInput] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [parseStep, setParseStep] = useState("")

  // Preload pdfjs into the module cache so the first drop feels instant
  useEffect(() => {
    import("pdfjs-dist").catch(() => {})
  }, [])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      const file = acceptedFiles[0]
      setIsParsing(true)

      try {
        // Step 1 — extract text in the browser
        setParseStep("Extracting text...")
        addChatMessage("assistant", `Reading "${file.name}"...`)

        let rawText: string
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          rawText = await extractPdfText(file)
        } else {
          rawText = await file.text()
        }

        // Step 2 — upload raw file to R2 (fire-and-forget, non-blocking)
        const formData = new FormData()
        formData.append("resume", file)
        fetch("/api/upload", { method: "POST", body: formData }).catch(
          console.error
        )

        // Step 3 — structure with AI
        setParseStep("AI is structuring your resume...")
        addChatMessage("assistant", "Sending to Llama 3.3 on Cloudflare Workers AI to structure your resume...")

        const resume = await parseResumeText(rawText)

        setResume(resume, true)
        setStatus("loaded")
        addChatMessage(
          "assistant",
          `Done! Resume loaded for **${resume.contact.name || "you"}**. Every field is inline-editable. Paste a Job Description below to start tailoring.`
        )
      } catch (err) {
        addChatMessage("assistant", `Error: ${(err as Error).message}`)
        setStatus("empty")
      } finally {
        setIsParsing(false)
        setParseStep("")
      }
    },
    [addChatMessage, setResume, setStatus]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: isParsing,
  })

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return
    setIsParsing(true)
    setParseStep("AI is structuring your resume...")
    addChatMessage("assistant", "Parsing your resume with Llama 3.3...")

    try {
      const resume = await parseResumeText(textInput)
      setResume(resume, true)
      setStatus("loaded")
      setTextInput("")
      setMode("drop")
      addChatMessage(
        "assistant",
        `Loaded! Every field is editable. Paste a Job Description below to start tailoring.`
      )
    } catch (err) {
      addChatMessage("assistant", `Error: ${(err as Error).message}`)
    } finally {
      setIsParsing(false)
      setParseStep("")
    }
  }

  if (status !== "empty") return null

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Import Resume
        </h3>
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            onClick={() => setMode("drop")}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
              mode === "drop"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            File
          </button>
          <button
            onClick={() => setMode("text")}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
              mode === "text"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Paste
          </button>
        </div>
      </div>

      {mode === "drop" ? (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center transition-all cursor-pointer",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-secondary/30",
            isParsing && "pointer-events-none opacity-60"
          )}
        >
          <input {...getInputProps()} />
          {isParsing ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-foreground">
              {isParsing
                ? parseStep
                : isDragActive
                  ? "Drop here"
                  : "Drop PDF or TXT"}
            </p>
            {!isParsing && (
              <p className="text-[10px] text-muted-foreground">
                or click to browse
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your full resume text here..."
            rows={6}
            className="resize-none text-xs bg-secondary/30 border-border"
            disabled={isParsing}
          />
          <Button
            size="sm"
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isParsing}
            className="self-end text-xs"
          >
            {isParsing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Type className="size-3" />
            )}
            Parse Text
          </Button>
        </div>
      )}

      <button
        onClick={loadSample}
        className="text-[10px] text-muted-foreground hover:text-primary transition-colors self-center"
      >
        or load sample resume
      </button>
    </div>
  )
}
