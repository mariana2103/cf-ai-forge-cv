"use client"

import { cn } from "@/lib/utils"

interface InlineEditProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  highlighted?: boolean
  multiline?: boolean
}

export function InlineEdit({
  value,
  onChange,
  className,
  placeholder = "Click to edit...",
  highlighted = false,
  multiline = false,
}: InlineEditProps) {
  const baseClasses = cn(
    "bg-transparent border-0 outline-none w-full transition-all duration-200",
    "hover:bg-secondary/40 focus:bg-secondary/60 focus:ring-1 focus:ring-primary/30",
    "rounded px-1 -mx-1",
    highlighted && "ring-1 ring-amber-400/40 bg-amber-400/5",
    className
  )

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(baseClasses, "resize-none field-sizing-content min-h-[1.4em]")}
        rows={1}
      />
    )
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={baseClasses}
    />
  )
}
