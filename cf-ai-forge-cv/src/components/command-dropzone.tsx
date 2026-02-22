"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, Type, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useResumeStore } from "@/lib/resume-store"

export function CommandDropzone() {
  const { status, setResume, setStatus, addChatMessage, loadSample } =
    useResumeStore()
  const [mode, setMode] = useState<"drop" | "text">("drop")
  const [textInput, setTextInput] = useState("")
  const [isParsing, setIsParsing] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      const file = acceptedFiles[0]
      setIsParsing(true)
      addChatMessage("assistant", `Uploading and parsing "${file.name}"...`)

      try {
        const formData = new FormData()
        formData.append("resume", file)

        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) throw new Error(await res.text())
        const { sections } = await res.json()

        // Turn the parsed sections into flat text, then let the AI structure it
        const rawText = Object.entries(sections as Record<string, string[]>)
          .map(([heading, lines]) => `${heading.toUpperCase()}\n${lines.join("\n")}`)
          .join("\n\n")

        const parseRes = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawText }),
        })
        if (!parseRes.ok) throw new Error(await parseRes.text())
        const { resume } = await parseRes.json()

        setResume(resume)
        setStatus("loaded")
        addChatMessage(
          "assistant",
          "Resume parsed and loaded. You can edit any field directly, or paste a Job Description to start tailoring."
        )
      } catch (err) {
        addChatMessage("assistant", `Error parsing resume: ${(err as Error).message}`)
        setStatus("empty")
      } finally {
        setIsParsing(false)
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
    addChatMessage("assistant", "Parsing your resume text with AI...")

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { resume } = await res.json()

      setResume(resume)
      setStatus("loaded")
      setTextInput("")
      setMode("drop")
      addChatMessage(
        "assistant",
        "Text parsed and loaded. All fields are editable. Try pasting a Job Description next."
      )
    } catch (err) {
      addChatMessage("assistant", `Error parsing text: ${(err as Error).message}`)
    } finally {
      setIsParsing(false)
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
              : "border-border hover:border-muted-foreground/40 hover:bg-secondary/30",
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
                ? "Parsing with AI..."
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
